import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../lib/auth'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const paymentSchema = z.object({
  patientId: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  method: z.enum(['PIX', 'CASH', 'CARD', 'TRANSFER']).optional(),
  description: z.string().optional(),
  paidAt: z.string().nullable().optional(),
  appointmentId: z.string().optional(),
})

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Cobrancas pendentes com vencimento no passado viram "vencidas" automaticamente.
async function refreshOverdue(clinicId: string) {
  await prisma.payment.updateMany({
    where: { clinicId, status: 'PENDING', dueDate: { lt: startOfDay(new Date()) } },
    data: { status: 'OVERDUE' },
  })
}

const include = { patient: { select: { id: true, name: true, phone: true, email: true } } }

export async function paymentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // Lista cobrancas com filtros.
  app.get('/', async (request, reply) => {
    const { from, to, status, patientId } = request.query as {
      from?: string
      to?: string
      status?: string
      patientId?: string
    }

    await refreshOverdue(request.user.clinicId)

    const payments = await prisma.payment.findMany({
      where: {
        clinicId: request.user.clinicId,
        ...(status && status !== 'ALL' ? { status } : {}),
        ...(patientId ? { patientId } : {}),
        ...(from || to
          ? { dueDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include,
      orderBy: [{ dueDate: 'desc' }],
    })
    return reply.send(payments)
  })

  // Resumo financeiro (KPIs, serie mensal, metodos e ranking de pacientes).
  app.get('/summary', async (request, reply) => {
    const clinicId = request.user.clinicId
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    await refreshOverdue(clinicId)

    const [paidMonth, paidPrevMonth, pending, overdue, paidRecent, topPaid, upcoming] = await Promise.all([
      prisma.payment.findMany({
        where: { clinicId, status: 'PAID', paidAt: { gte: monthStart, lt: nextMonthStart } },
        select: { amount: true, method: true },
      }),
      prisma.payment.aggregate({
        where: { clinicId, status: 'PAID', paidAt: { gte: prevMonthStart, lt: monthStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({ where: { clinicId, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { clinicId, status: 'OVERDUE' }, _sum: { amount: true }, _count: true }),
      prisma.payment.findMany({
        where: { clinicId, status: 'PAID', paidAt: { gte: sixMonthsStart } },
        select: { amount: true, paidAt: true },
      }),
      prisma.payment.findMany({
        where: { clinicId, status: 'PAID' },
        select: { amount: true, patient: { select: { id: true, name: true } } },
        take: 2000,
      }),
      prisma.payment.findMany({
        where: { clinicId, status: { in: ['PENDING', 'OVERDUE'] } },
        include,
        orderBy: { dueDate: 'asc' },
        take: 6,
      }),
    ])

    const receivedMonth = paidMonth.reduce((s, p) => s + p.amount, 0)
    const receivedPrevMonth = paidPrevMonth._sum.amount || 0

    // Serie dos ultimos 6 meses.
    const series = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS_SHORT[d.getMonth()], year: d.getFullYear(), total: 0 }
    })
    for (const p of paidRecent) {
      if (!p.paidAt) continue
      const bucket = series.find((b) => b.key === `${p.paidAt!.getFullYear()}-${p.paidAt!.getMonth()}`)
      if (bucket) bucket.total += p.amount
    }

    // Recebido por forma de pagamento no mes.
    const byMethod = new Map<string, number>()
    for (const p of paidMonth) {
      const key = p.method || 'OUTRO'
      byMethod.set(key, (byMethod.get(key) || 0) + p.amount)
    }

    // Ranking de pacientes por valor pago.
    const perPatient = new Map<string, { name: string; total: number }>()
    for (const p of topPaid) {
      const entry = perPatient.get(p.patient.id) || { name: p.patient.name, total: 0 }
      entry.total += p.amount
      perPatient.set(p.patient.id, entry)
    }
    const topPatients = [...perPatient.entries()]
      .map(([id, v]) => ({ id, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    const count = paidMonth.length
    const trend = receivedPrevMonth > 0 ? ((receivedMonth - receivedPrevMonth) / receivedPrevMonth) * 100 : null

    return reply.send({
      receivedMonth,
      receivedPrevMonth,
      trend,
      ticketMedio: count > 0 ? receivedMonth / count : 0,
      paidCountMonth: count,
      pendingAmount: pending._sum.amount || 0,
      pendingCount: pending._count,
      overdueAmount: overdue._sum.amount || 0,
      overdueCount: overdue._count,
      forecast: (pending._sum.amount || 0) + (overdue._sum.amount || 0),
      series,
      byMethod: [...byMethod.entries()].map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
      topPatients,
      upcoming,
    })
  })

  // ---------- Geracao automatica das cobrancas do mes (recorrencia) ----------
  // Cria uma cobranca para cada paciente ativo que tenha valor padrao definido,
  // pulando quem ja tem cobranca naquele mes.
  app.post('/generate-monthly', async (request, reply) => {
    const clinicId = request.user.clinicId
    const body = (request.body || {}) as { month?: string; dueDay?: number; description?: string }

    // month no formato YYYY-MM (padrao: mes atual)
    const now = new Date()
    const match = /^(\d{4})-(\d{2})$/.exec(body.month || '')
    const year = match ? Number(match[1]) : now.getFullYear()
    const month = match ? Number(match[2]) - 1 : now.getMonth()
    const dueDay = Math.min(Math.max(body.dueDay ?? 10, 1), 28)

    const periodStart = new Date(year, month, 1)
    const periodEnd = new Date(year, month + 1, 1)
    const dueDate = new Date(year, month, dueDay, 12, 0, 0)

    const patients = await prisma.patient.findMany({
      where: {
        clinicId,
        deletedAt: null,
        status: 'ACTIVE',
        defaultSessionPrice: { not: null },
      },
      select: { id: true, name: true, defaultSessionPrice: true },
      orderBy: { name: 'asc' },
    })

    // Quem ja tem cobranca com vencimento no mes fica de fora.
    const existing = await prisma.payment.findMany({
      where: { clinicId, dueDate: { gte: periodStart, lt: periodEnd } },
      select: { patientId: true },
    })
    const already = new Set(existing.map((p) => p.patientId))

    const description = body.description || `Mensalidade ${MONTHS_SHORT[month]}/${year}`
    const toCreate = patients.filter((p) => !already.has(p.id))

    if (toCreate.length > 0) {
      await prisma.payment.createMany({
        data: toCreate.map((p) => ({
          clinicId,
          patientId: p.id,
          amount: p.defaultSessionPrice as number,
          status: 'PENDING',
          description,
          dueDate,
        })),
      })
    }

    return reply.send({
      created: toCreate.length,
      skipped: patients.length - toCreate.length,
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      dueDate,
      skippedPatients: patients.filter((p) => already.has(p.id)).map((p) => p.name),
    })
  })

  app.post('/', async (request, reply) => {
    const parsed = paymentSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const data = parsed.data

    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId: request.user.clinicId } })
    if (!patient) return reply.code(404).send({ error: 'Paciente não encontrado' })

    // Cobranca vinculada a uma sessao da agenda (opcional).
    if (data.appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: data.appointmentId, clinicId: request.user.clinicId },
      })
      if (!appointment) return reply.code(404).send({ error: 'Sessão não encontrada' })
    }

    const payment = await prisma.payment.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        status: data.status || 'PENDING',
        method: data.method || null,
        description: data.description || null,
        paidAt: data.paidAt ? new Date(data.paidAt) : data.status === 'PAID' ? new Date() : null,
      },
      include,
    })
    return reply.code(201).send(payment)
  })

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = paymentSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos' })
    const data = parsed.data

    const existing = await prisma.payment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Cobrança não encontrada' })

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        patientId: data.patientId,
        appointmentId: data.appointmentId === undefined ? undefined : data.appointmentId || null,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: data.status,
        method: data.method === undefined ? undefined : data.method || null,
        description: data.description === undefined ? undefined : data.description || null,
        paidAt: data.paidAt === undefined ? undefined : data.paidAt ? new Date(data.paidAt) : null,
      },
      include,
    })
    return reply.send(payment)
  })

  // Registra o pagamento (baixa).
  app.post('/:id/pay', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = (request.body ?? {}) as { method?: string }
    const existing = await prisma.payment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Cobrança não encontrada' })

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), method: body.method || existing.method || null },
      include,
    })
    return reply.send(payment)
  })

  // Desfaz a baixa (volta para pendente).
  app.post('/:id/unpay', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.payment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Cobrança não encontrada' })

    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'PENDING', paidAt: null },
      include,
    })
    return reply.send(payment)
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.payment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Cobrança não encontrada' })
    await prisma.payment.delete({ where: { id } })
    return reply.code(204).send()
  })
}

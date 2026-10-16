import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../lib/auth'

const patientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().nullable().optional(),
  document: z.string().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  referralSource: z.string().optional(),
  defaultSessionPrice: z.number().nonnegative().nullable().optional(),
  consentAt: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

function toDate(value?: string | null): Date | null {
  if (!value) return null
  // 'YYYY-MM-DD' puro e interpretado como meia-noite local (12h para evitar
  // que o fuso empurre a data para o dia anterior/seguinte).
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const d = bare ? new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]), 12, 0, 0) : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// Status de sessao que contam como "sessao que ainda vai acontecer".
const UPCOMING_STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
// Cobrancas que ainda nao foram pagas.
const OPEN_STATUSES = ['PENDING', 'OVERDUE']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Procura outros pacientes da clinica com o mesmo e-mail ou telefone.
async function findDuplicates(clinicId: string, email?: string | null, phone?: string | null, excludeId?: string) {
  const ors: { email?: string; phone?: string }[] = []
  if (email) ors.push({ email })
  if (phone) ors.push({ phone })
  if (ors.length === 0) return []
  return prisma.patient.findMany({
    where: {
      clinicId,
      deletedAt: null,
      OR: ors,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, email: true, phone: true },
  })
}

export async function patientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ---------- Resumo da carteira (cards do topo) ----------
  app.get('/stats', async (request, reply) => {
    const clinicId = request.user.clinicId
    const now = new Date()

    const [total, active, inactive, trash, newThisMonth, withBirthday] = await Promise.all([
      prisma.patient.count({ where: { clinicId, deletedAt: null } }),
      prisma.patient.count({ where: { clinicId, deletedAt: null, status: 'ACTIVE' } }),
      prisma.patient.count({ where: { clinicId, deletedAt: null, status: 'INACTIVE' } }),
      prisma.patient.count({ where: { clinicId, deletedAt: { not: null } } }),
      prisma.patient.count({ where: { clinicId, deletedAt: null, createdAt: { gte: startOfMonth(now) } } }),
      prisma.patient.findMany({
        where: { clinicId, deletedAt: null, birthDate: { not: null } },
        select: { id: true, name: true, phone: true, birthDate: true },
      }),
    ])

    const birthdays = withBirthday
      .filter((p) => p.birthDate && p.birthDate.getMonth() === now.getMonth())
      .map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        day: p.birthDate!.getDate(),
        birthDate: p.birthDate!,
      }))
      .sort((a, b) => a.day - b.day)

    return reply.send({ total, active, inactive, trash, newThisMonth, birthdays })
  })

  // ---------- Lista de pacientes (com dados agregados) ----------
  app.get('/', async (request, reply) => {
    const clinicId = request.user.clinicId
    const { q, status = 'ACTIVE', order = 'name' } = request.query as {
      q?: string
      status?: 'ACTIVE' | 'INACTIVE' | 'ALL' | 'TRASH'
      order?: 'name' | 'recent' | 'next' | 'open'
    }

    const where = {
      clinicId,
      ...(status === 'TRASH' ? { deletedAt: { not: null } } : { deletedAt: null }),
      ...(status === 'ACTIVE' || status === 'INACTIVE' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { document: { contains: q } },
            ],
          }
        : {}),
    }

    const patients = await prisma.patient.findMany({ where, orderBy: { name: 'asc' } })
    if (patients.length === 0) return reply.send([])

    const ids = patients.map((p) => p.id)

    const [upcoming, done, open, paid] = await Promise.all([
      prisma.appointment.findMany({
        where: { clinicId, patientId: { in: ids }, startAt: { gte: new Date() }, status: { in: UPCOMING_STATUSES } },
        orderBy: { startAt: 'asc' },
        select: { id: true, patientId: true, startAt: true, modality: true, status: true },
      }),
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: { clinicId, patientId: { in: ids }, status: 'DONE' },
        _count: { _all: true },
        _max: { startAt: true },
      }),
      prisma.payment.groupBy({
        by: ['patientId'],
        where: { clinicId, patientId: { in: ids }, status: { in: OPEN_STATUSES } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ['patientId'],
        where: { clinicId, patientId: { in: ids }, status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    // Primeira sessao futura de cada paciente (a lista ja vem ordenada por data).
    const nextByPatient = new Map<string, (typeof upcoming)[number]>()
    for (const a of upcoming) if (!nextByPatient.has(a.patientId)) nextByPatient.set(a.patientId, a)

    const doneByPatient = new Map(done.map((d) => [d.patientId, d]))
    const openByPatient = new Map(open.map((o) => [o.patientId, o]))
    const paidByPatient = new Map(paid.map((p) => [p.patientId, p]))

    let items = patients.map((p) => {
      const next = nextByPatient.get(p.id) ?? null
      const d = doneByPatient.get(p.id)
      return {
        ...p,
        nextAppointment: next ? { id: next.id, startAt: next.startAt, modality: next.modality, status: next.status } : null,
        lastSessionAt: d?._max.startAt ?? null,
        sessionCount: d?._count._all ?? 0,
        openAmount: openByPatient.get(p.id)?._sum.amount ?? 0,
        openCount: openByPatient.get(p.id)?._count._all ?? 0,
        paidTotal: paidByPatient.get(p.id)?._sum.amount ?? 0,
      }
    })

    if (order === 'recent') {
      items = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } else if (order === 'next') {
      items = items.sort((a, b) => {
        if (!!a.nextAppointment !== !!b.nextAppointment) return a.nextAppointment ? -1 : 1
        if (!a.nextAppointment || !b.nextAppointment) return 0
        return new Date(a.nextAppointment.startAt).getTime() - new Date(b.nextAppointment.startAt).getTime()
      })
    } else if (order === 'open') {
      items = items.sort((a, b) => b.openAmount - a.openAmount)
    }

    return reply.send(items)
  })

  // ---------- Perfil completo do paciente ----------
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.user.clinicId

    const patient = await prisma.patient.findFirst({ where: { id, clinicId } })
    if (!patient) return reply.code(404).send({ error: 'Paciente não encontrado' })

    const [appointments, payments] = await Promise.all([
      prisma.appointment.findMany({
        where: { clinicId, patientId: id },
        orderBy: { startAt: 'desc' },
        include: { psychologist: { select: { id: true, name: true } } },
      }),
      prisma.payment.findMany({ where: { clinicId, patientId: id }, orderBy: { dueDate: 'desc' } }),
    ])

    const now = new Date()
    const done = appointments.filter((a) => a.status === 'DONE')
    const future = appointments
      .filter((a) => a.startAt >= now && UPCOMING_STATUSES.includes(a.status))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())

    const paidPayments = payments.filter((p) => p.status === 'PAID')
    const openPayments = payments.filter((p) => OPEN_STATUSES.includes(p.status))
    const overduePayments = payments.filter((p) => p.status === 'OVERDUE')

    const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0)
    const openAmount = openPayments.reduce((s, p) => s + p.amount, 0)
    const overdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0)

    // Frequencia media: intervalo entre as ultimas sessoes realizadas.
    const lastDone = done.slice(0, 11) // ja vem em ordem desc
    let frequencyDays: number | null = null
    if (lastDone.length >= 2) {
      const gaps: number[] = []
      for (let i = 0; i < lastDone.length - 1; i++) {
        gaps.push((lastDone[i].startAt.getTime() - lastDone[i + 1].startAt.getTime()) / 86_400_000)
      }
      const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length
      const rounded = Math.round(avg)
      frequencyDays = rounded <= 0 ? 0 : rounded
    }

    const stats = {
      sessionCount: done.length,
      canceledCount: appointments.filter((a) => a.status === 'CANCELED').length,
      noShowCount: appointments.filter((a) => a.status === 'NO_SHOW').length,
      totalAppointments: appointments.length,
      totalPaid,
      paidCount: paidPayments.length,
      openAmount,
      openCount: openPayments.length,
      overdueAmount,
      overdueCount: overduePayments.length,
      ticketMedio: paidPayments.length ? totalPaid / paidPayments.length : 0,
      firstSessionAt: done.length ? done[done.length - 1].startAt : null,
      lastSessionAt: done.length ? done[0].startAt : null,
      nextAppointment: future[0] ?? null,
      frequencyDays,
    }

    return reply.send({ ...patient, appointments, payments, stats })
  })

  // ---------- Criar ----------
  app.post('/', async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const parsed = patientSchema.safeParse(body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const data = parsed.data
    const clinicId = request.user.clinicId

    // Evita cadastro duplicado (mesmo telefone/e-mail) sem confirmacao explicita.
    if (body.allowDuplicate !== true) {
      const duplicates = await findDuplicates(clinicId, data.email || null, data.phone || null)
      if (duplicates.length > 0) {
        return reply.code(409).send({ error: 'Já existe paciente com este e-mail ou telefone', duplicates })
      }
    }

    const patient = await prisma.patient.create({
      data: {
        clinicId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        birthDate: toDate(data.birthDate),
        document: data.document || null,
        notes: data.notes || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        referralSource: data.referralSource || null,
        defaultSessionPrice: data.defaultSessionPrice ?? null,
        consentAt: toDate(data.consentAt),
        status: data.status || 'ACTIVE',
      },
    })
    return reply.code(201).send(patient)
  })

  // ---------- Editar ----------
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown>
    const parsed = patientSchema.partial().safeParse(body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos' })
    const data = parsed.data
    const clinicId = request.user.clinicId

    const existing = await prisma.patient.findFirst({ where: { id, clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Paciente não encontrado' })

    if (body.allowDuplicate !== true) {
      const email = data.email === undefined ? existing.email : data.email || null
      const phone = data.phone === undefined ? existing.phone : data.phone || null
      const duplicates = await findDuplicates(clinicId, email, phone, id)
      if (duplicates.length > 0) {
        return reply.code(409).send({ error: 'Já existe paciente com este e-mail ou telefone', duplicates })
      }
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email === undefined ? undefined : data.email || null,
        phone: data.phone === undefined ? undefined : data.phone || null,
        birthDate: data.birthDate === undefined ? undefined : toDate(data.birthDate),
        document: data.document === undefined ? undefined : data.document || null,
        notes: data.notes === undefined ? undefined : data.notes || null,
        address: data.address === undefined ? undefined : data.address || null,
        emergencyContact: data.emergencyContact === undefined ? undefined : data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone === undefined ? undefined : data.emergencyPhone || null,
        referralSource: data.referralSource === undefined ? undefined : data.referralSource || null,
        defaultSessionPrice: data.defaultSessionPrice === undefined ? undefined : data.defaultSessionPrice,
        consentAt: data.consentAt === undefined ? undefined : toDate(data.consentAt),
        status: data.status,
      },
    })
    return reply.send(patient)
  })

  // ---------- Inativar / ativar rapidamente ----------
  app.post('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status?: string }
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return reply.code(400).send({ error: 'Status inválido' })
    }
    const existing = await prisma.patient.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Paciente não encontrado' })

    const patient = await prisma.patient.update({ where: { id }, data: { status } })
    return reply.send(patient)
  })

  // ---------- Excluir ----------
  // Por padrao faz exclusao logica (mantem sessoes e financeiro).
  // Com ?hard=true apaga de verdade (e o historico em cascata).
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { hard } = request.query as { hard?: string }
    const existing = await prisma.patient.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Paciente não encontrado' })

    if (hard === 'true') {
      await prisma.patient.delete({ where: { id } })
      return reply.code(204).send()
    }

    await prisma.patient.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } })
    return reply.code(204).send()
  })

  // ---------- Restaurar (da lixeira) ----------
  app.post('/:id/restore', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.patient.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Paciente não encontrado' })

    const patient = await prisma.patient.update({
      where: { id },
      data: { deletedAt: null, status: 'ACTIVE' },
    })
    return reply.send(patient)
  })
}

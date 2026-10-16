import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticatePatient } from '../lib/auth'

/* ============================================================================
   Portal do paciente (rotas publicas, autenticadas por token de paciente).
   Nenhuma rota aqui aceita token de clinica — e nenhuma consulta usa clinicId
   vindo do front: tudo e sempre filtrado por request.patient.id.
   ========================================================================== */

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const proofSchema = z.object({
  paymentId: z.string().optional().nullable(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive().optional(),
  dataBase64: z.string().min(1),
  note: z.string().optional(),
})

// Sessoes que ainda vao acontecer (nelas o link da videochamada fica visivel).
const LIVE_STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']

function startOfDay(date: Date): Date {
  const x = new Date(date)
  x.setHours(0, 0, 0, 0)
  return x
}

// Cobrancas pendentes com vencimento no passado viram "vencidas".
async function refreshOverdue(patientId: string) {
  await prisma.payment.updateMany({
    where: { patientId, status: 'PENDING', dueDate: { lt: startOfDay(new Date()) } },
    data: { status: 'OVERDUE' },
  })
}

// Procura o paciente pelo e-mail (sem diferenciar maiusculas) entre os que tem
// o acesso ao portal liberado. E-mail e unico por clinica para evitar confusao.
async function findPortalPatient(email: string) {
  const target = email.trim().toLowerCase()
  const candidates = await prisma.patient.findMany({
    where: { portalEnabled: true, deletedAt: null, email: { not: null } },
    select: { id: true, name: true, email: true, portalPassword: true, clinicId: true },
  })
  return candidates.find((p) => (p.email || '').trim().toLowerCase() === target) ?? null
}

function base64ToBuffer(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const decoded = Buffer.from(clean, 'base64')
  const out = new Uint8Array(decoded.byteLength)
  out.set(decoded)
  return out
}

// Formato enxuto do paciente devolvido ao portal.
function patientPayload(patient: { id: string; name: string; email: string | null; phone: string | null }, clinicName: string, pixKey: string | null) {
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone ?? '',
    clinicName,
    pixKey,
  }
}

export async function portalRoutes(app: FastifyInstance) {
  // ---------- Criar acesso (primeira senha) ----------
  app.post('/register', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe um e-mail valido e uma senha com pelo menos 6 caracteres' })

    const { email, password } = parsed.data
    const patient = await findPortalPatient(email)
    if (!patient) {
      return reply.code(404).send({
        error: 'Não encontramos um paciente com este e-mail e acesso liberado. Confira o e-mail ou fale com seu psicólogo.',
      })
    }
    if (patient.portalPassword) {
      return reply.code(409).send({ error: 'Este e-mail já tem acesso. Faca login com a sua senha.' })
    }

    const hash = await bcrypt.hash(password, 10)
    await prisma.patient.update({
      where: { id: patient.id },
      data: { portalPassword: hash, portalAcceptedAt: new Date(), portalLastSeenAt: new Date() },
    })

    const full = await prisma.patient.findUniqueOrThrow({
      where: { id: patient.id },
      select: { id: true, name: true, email: true, phone: true, clinic: { select: { name: true, pixKey: true } } },
    })

    const token = app.jwt.sign({ sub: patient.id, clinicId: patient.clinicId, role: 'PATIENT' })
    return reply.send({ token, patient: patientPayload(full, full.clinic.name, full.clinic.pixKey) })
  })

  // ---------- Login ----------
  app.post('/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe e-mail e senha' })

    const { email, password } = parsed.data
    const patient = await findPortalPatient(email)
    if (!patient) return reply.code(401).send({ error: 'E-mail ou senha inválidos' })
    if (!patient.portalPassword) {
      return reply.code(400).send({ error: 'Você ainda não criou sua senha. Entre em "Primeiro acesso".' })
    }

    const ok = await bcrypt.compare(password, patient.portalPassword)
    if (!ok) return reply.code(401).send({ error: 'E-mail ou senha inválidos' })

    await prisma.patient.update({ where: { id: patient.id }, data: { portalLastSeenAt: new Date() } })

    const full = await prisma.patient.findUniqueOrThrow({
      where: { id: patient.id },
      select: { id: true, name: true, email: true, phone: true, clinic: { select: { name: true, pixKey: true } } },
    })

    const token = app.jwt.sign({ sub: patient.id, clinicId: patient.clinicId, role: 'PATIENT' })
    return reply.send({ token, patient: patientPayload(full, full.clinic.name, full.clinic.pixKey) })
  })

  // ---------- Daqui para baixo exige token de paciente ----------
  app.register(async (priv) => {
    priv.addHook('preHandler', authenticatePatient)

    priv.get('/me', async (request) => request.patient)

    // ---------- Inicio: proxima sessao, pendencias e novidades ----------
    priv.get('/overview', async (request) => {
      const { id: patientId } = request.patient!
      await refreshOverdue(patientId)

      const now = new Date()
      const [next, upcoming, payments, unread, tasks, materials, proofs] = await Promise.all([
        prisma.appointment.findFirst({
          where: { patientId, startAt: { gte: now }, status: { in: LIVE_STATUSES } },
          orderBy: { startAt: 'asc' },
          include: { psychologist: { select: { name: true } } },
        }),
        prisma.appointment.count({ where: { patientId, startAt: { gte: now }, status: { in: LIVE_STATUSES } } }),
        prisma.payment.findMany({ where: { patientId }, select: { amount: true, status: true } }),
        prisma.message.count({ where: { patientId, author: 'CLINIC', readAt: null } }),
        prisma.task.count({ where: { patientId, doneAt: null } }),
        prisma.material.count({ where: { patientId } }),
        prisma.proof.count({ where: { patientId } }),
      ])

      const open = payments.filter((p) => p.status !== 'PAID')
      return {
        next: next ? serializeAppointment(next, now) : null,
        upcoming,
        openAmount: round(open.reduce((s, p) => s + p.amount, 0)),
        overdueAmount: round(payments.filter((p) => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)),
        openCount: open.length,
        unreadMessages: unread,
        pendingTasks: tasks,
        materials,
        proofs,
      }
    })

    // ---------- Sessoes ----------
    priv.get('/appointments', async (request) => {
      const { id: patientId } = request.patient!
      const now = new Date()
      const list = await prisma.appointment.findMany({
        where: { patientId },
        orderBy: { startAt: 'desc' },
        include: { psychologist: { select: { name: true } } },
      })
      return list.map((a) => serializeAppointment(a, now))
    })

    // Confirmacao de presenca pelo paciente.
    priv.post('/appointments/:id/confirm', async (request, reply) => {
      const { id } = request.params as { id: string }
      const { id: patientId } = request.patient!

      const appointment = await prisma.appointment.findFirst({ where: { id, patientId } })
      if (!appointment) return reply.code(404).send({ error: 'Sessão não encontrada' })
      if (appointment.status === 'CANCELED' || appointment.status === 'DONE' || appointment.status === 'NO_SHOW') {
        return reply.code(400).send({ error: 'Esta sessão não pode mais ser confirmada' })
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          confirmedAt: new Date(),
          confirmedBy: 'PATIENT',
          status: appointment.status === 'SCHEDULED' ? 'CONFIRMED' : appointment.status,
        },
        include: { psychologist: { select: { name: true } } },
      })
      return reply.send(serializeAppointment(updated, new Date()))
    })

    // ---------- Financeiro ----------
    priv.get('/payments', async (request) => {
      const { id: patientId } = request.patient!
      await refreshOverdue(patientId)

      const list = await prisma.payment.findMany({ where: { patientId }, orderBy: [{ dueDate: 'desc' }] })
      const open = list.filter((p) => p.status !== 'PAID')
      const paid = list.filter((p) => p.status === 'PAID')

      return {
        payments: list.map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          method: p.method,
          description: p.description,
          dueDate: p.dueDate,
          paidAt: p.paidAt,
        })),
        summary: {
          openAmount: round(open.reduce((s, p) => s + p.amount, 0)),
          overdueAmount: round(list.filter((p) => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)),
          paidTotal: round(paid.reduce((s, p) => s + p.amount, 0)),
          openCount: open.length,
          paidCount: paid.length,
        },
        pixKey: request.patient!.pixKey,
      }
    })

    // Comprovante de pagamento enviado pelo paciente.
    priv.post('/proofs', async (request, reply) => {
      const parsed = proofSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Anexe um arquivo valido' })

      const data = parsed.data
      const buffer = base64ToBuffer(data.dataBase64)
      if (buffer.length === 0) return reply.code(400).send({ error: 'Arquivo vazio' })
      if (buffer.length > MAX_FILE_BYTES) return reply.code(413).send({ error: 'Arquivo muito grande (limite de 5 MB)' })

      if (data.paymentId) {
        const payment = await prisma.payment.findFirst({ where: { id: data.paymentId, patientId: request.patient!.id } })
        if (!payment) return reply.code(404).send({ error: 'Cobrança não encontrada' })
      }

      const proof = await prisma.proof.create({
        data: {
          clinicId: request.patient!.clinicId,
          patientId: request.patient!.id,
          paymentId: data.paymentId || null,
          fileName: data.fileName,
          mimeType: data.mimeType,
          size: data.size || buffer.length,
          data: buffer,
          note: data.note,
        },
        select: { id: true, fileName: true, size: true, note: true, createdAt: true, paymentId: true, reviewedAt: true },
      })
      return reply.code(201).send(proof)
    })

    priv.get('/proofs', async (request) => {
      return prisma.proof.findMany({
        where: { patientId: request.patient!.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileName: true, size: true, note: true, createdAt: true, paymentId: true, reviewedAt: true },
      })
    })

    // ---------- Recados ----------
    priv.get('/messages', async (request) => {
      const { id: patientId } = request.patient!
      // Marca como lidos os recados da clinica (o profissional ve que foi lido).
      await prisma.message.updateMany({ where: { patientId, author: 'CLINIC', readAt: null }, data: { readAt: new Date() } })
      return prisma.message.findMany({
        where: { patientId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, author: true, body: true, createdAt: true, readAt: true },
      })
    })

    priv.post('/messages', async (request, reply) => {
      const body = z.object({ body: z.string().min(1).max(2000) }).safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: 'Escreva um recado' })

      const message = await prisma.message.create({
        data: { clinicId: request.patient!.clinicId, patientId: request.patient!.id, author: 'PATIENT', body: body.data.body },
        select: { id: true, author: true, body: true, createdAt: true, readAt: true },
      })
      return reply.code(201).send(message)
    })

    // ---------- Documentos ----------
    priv.get('/documents', async (request) => {
      return prisma.document.findMany({
        where: { patientId: request.patient!.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true },
      })
    })

    priv.get('/documents/:id/file', async (request, reply) => {
      const { id } = request.params as { id: string }
      const doc = await prisma.document.findFirst({ where: { id, patientId: request.patient!.id } })
      if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

      return reply
        .header('Content-Type', doc.mimeType || 'application/octet-stream')
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
        .send(Buffer.from(doc.data))
    })

    // ---------- Materiais recomendados ----------
    priv.get('/materials', async (request) => {
      return prisma.material.findMany({
        where: { patientId: request.patient!.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, kind: true, url: true, note: true, createdAt: true },
      })
    })

    // ---------- Tarefas entre sessoes ----------
    priv.get('/tasks', async (request) => {
      return prisma.task.findMany({
        where: { patientId: request.patient!.id },
        orderBy: [{ doneAt: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, description: true, dueDate: true, doneAt: true, createdAt: true },
      })
    })

    priv.post('/tasks/:id/toggle', async (request, reply) => {
      const { id } = request.params as { id: string }
      const task = await prisma.task.findFirst({ where: { id, patientId: request.patient!.id } })
      if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' })

      const updated = await prisma.task.update({
        where: { id },
        data: { doneAt: task.doneAt ? null : new Date() },
        select: { id: true, title: true, description: true, dueDate: true, doneAt: true, createdAt: true },
      })
      return reply.send(updated)
    })

    // ---------- Perfil: telefone e e-mail ----------
    priv.put('/contact', async (request, reply) => {
      const parsed = z
        .object({ phone: z.string().min(8), email: z.string().email() })
        .safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Informe um telefone e um e-mail validos' })

      const { phone, email } = parsed.data
      const patientId = request.patient!.id
      const clinicId = request.patient!.clinicId

      // Nao deixa dois pacientes da mesma clinica ficarem com o mesmo e-mail ou
      // telefone (o e-mail e a chave de entrada no portal).
      const conflict = await prisma.patient.findFirst({
        where: {
          clinicId,
          deletedAt: null,
          id: { not: patientId },
          OR: [{ email: { equals: email } }, { phone: { equals: phone } }],
        },
        select: { id: true },
      })
      if (conflict) {
        return reply.code(409).send({ error: 'Já existe outro cadastro com este e-mail ou telefone. Fale com seu psicólogo.' })
      }

      const updated = await prisma.patient.update({
        where: { id: patientId },
        data: { phone, email },
        select: { id: true, name: true, email: true, phone: true },
      })
      return reply.send(updated)
    })
  })
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

type AppointmentRow = {
  id: string
  startAt: Date
  endAt: Date
  status: string
  modality: string
  meetLink: string | null
  confirmedAt: Date | null
  confirmedBy: string | null
  sessionStartedAt: Date | null
  sessionEndedAt: Date | null
  psychologist: { name: string }
}

// O link da videochamada so aparece enquanto a sessao esta por acontecer —
// depois de realizada/cancelada ele deixa de ser exposto.
function serializeAppointment(a: AppointmentRow, now: Date) {
  const live = LIVE_STATUSES.includes(a.status) && a.endAt >= now
  return {
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    modality: a.modality,
    confirmedAt: a.confirmedAt,
    confirmedBy: a.confirmedBy,
    meetLink: live && a.meetLink ? a.meetLink : null,
    professional: a.psychologist.name,
    durationMin: Math.round((a.endAt.getTime() - a.startAt.getTime()) / 60000),
  }
}

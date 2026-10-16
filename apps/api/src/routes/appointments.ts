import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../lib/auth'

const appointmentSchema = z.object({
  patientId: z.string().min(1),
  psychologistId: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELED', 'NO_SHOW']).optional(),
  modality: z.enum(['IN_PERSON', 'ONLINE']).optional(),
  notes: z.string().optional(),
})

export async function appointmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // Lista agendamentos (filtro opcional por intervalo de datas).
  app.get('/', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string }
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: request.user.clinicId,
        ...(from || to
          ? {
              startAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        patient: true,
        psychologist: { select: { id: true, name: true } },
        payments: { select: { id: true, status: true, amount: true, dueDate: true } },
      },
      orderBy: { startAt: 'asc' },
    })
    return reply.send(appointments)
  })

  app.post('/', async (request, reply) => {
    const parsed = appointmentSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const data = parsed.data

    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, clinicId: request.user.clinicId },
    })
    if (!patient) return reply.code(404).send({ error: 'Paciente não encontrado' })

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: data.patientId,
        psychologistId: data.psychologistId || request.user.sub,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        status: data.status || 'SCHEDULED',
        modality: data.modality || 'IN_PERSON',
        notes: data.notes || null,
      },
      include: { patient: true, psychologist: { select: { id: true, name: true } } },
    })
    return reply.code(201).send(appointment)
  })

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = appointmentSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos' })
    const data = parsed.data

    const existing = await prisma.appointment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Agendamento não encontrado' })

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        patientId: data.patientId,
        psychologistId: data.psychologistId,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        status: data.status,
        modality: data.modality,
        notes: data.notes === undefined ? undefined : data.notes || null,
      },
      include: { patient: true, psychologist: { select: { id: true, name: true } } },
    })
    return reply.send(appointment)
  })

  // Gera (ou salva) o link da videochamada da sessao.
  // Se nenhum link for enviado, cria uma sala publica no Jitsi (sem configuracao).
  app.post('/:id/meet', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = (request.body ?? {}) as { link?: string }

    const existing = await prisma.appointment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Agendamento não encontrado' })

    let link = body.link?.trim()
    if (!link) {
      const slug = `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`
      link = `https://meet.jit.si/psihub-${slug}`
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { meetLink: link, modality: 'ONLINE' },
      include: { patient: true, psychologist: { select: { id: true, name: true } } },
    })
    return reply.send(appointment)
  })

  // Inicia a sessao (em andamento + horario de inicio).
  app.post('/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.appointment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Agendamento não encontrado' })

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'IN_PROGRESS', sessionStartedAt: new Date(), sessionEndedAt: null },
      include: { patient: true, psychologist: { select: { id: true, name: true } } },
    })
    return reply.send(appointment)
  })

  // Finaliza a sessao (realizada + horario de termino).
  app.post('/:id/finish', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.appointment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Agendamento não encontrado' })

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'DONE',
        sessionStartedAt: existing.sessionStartedAt ?? new Date(),
        sessionEndedAt: new Date(),
      },
      include: { patient: true, psychologist: { select: { id: true, name: true } } },
    })
    return reply.send(appointment)
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.appointment.findFirst({ where: { id, clinicId: request.user.clinicId } })
    if (!existing) return reply.code(404).send({ error: 'Agendamento não encontrado' })
    await prisma.appointment.delete({ where: { id } })
    return reply.code(204).send()
  })
}

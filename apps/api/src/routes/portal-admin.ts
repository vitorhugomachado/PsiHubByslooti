import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../lib/auth'

/* ============================================================================
   Lado da clinica: libera o acesso do paciente e gerencia tudo o que aparece
   no portal (recados, documentos, materiais, tarefas e comprovantes).
   ========================================================================== */

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

function tempPassword(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]
  return out
}

function base64ToBuffer(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const decoded = Buffer.from(clean, 'base64')
  const out = new Uint8Array(decoded.byteLength)
  out.set(decoded)
  return out
}

// Garante que o paciente existe e e da clinica do usuario logado.
async function findPatient(request: FastifyRequest, reply: FastifyReply, id: string) {
  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: request.user.clinicId, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true },
  })
  if (!patient) {
    reply.code(404).send({ error: 'Paciente não encontrado' })
    return null
  }
  return patient
}

export async function portalAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ---------- Resumo para o painel (novidades pendentes) ----------
  app.get('/summary', async (request) => {
    const clinicId = request.user.clinicId
    const [unreadMessages, newProofs, portalPatients, pendingTasks] = await Promise.all([
      prisma.message.count({ where: { clinicId, author: 'PATIENT', readAt: null } }),
      prisma.proof.count({ where: { clinicId, reviewedAt: null } }),
      prisma.patient.count({ where: { clinicId, deletedAt: null, portalEnabled: true } }),
      prisma.task.count({ where: { clinicId, doneAt: null } }),
    ])
    return { unreadMessages, newProofs, portalPatients, pendingTasks }
  })

  // ---------- Chave PIX da clinica (mostrada no portal) ----------
  app.get('/pix', async (request) => {
    const clinic = await prisma.clinic.findUnique({
      where: { id: request.user.clinicId },
      select: { pixKey: true },
    })
    return { pixKey: clinic?.pixKey ?? null }
  })

  app.put('/pix', async (request, reply) => {
    const parsed = z.object({ pixKey: z.string().max(200).nullable() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Chave PIX inválida' })

    const pixKey = parsed.data.pixKey?.trim() || null
    await prisma.clinic.update({ where: { id: request.user.clinicId }, data: { pixKey } })
    return reply.send({ pixKey })
  })

  // ---------- Estado completo do portal de um paciente (aba "Portal") ----------
  app.get('/patients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const full = await prisma.patient.findUniqueOrThrow({
      where: { id },
      select: {
        portalEnabled: true,
        portalPassword: true,
        portalAcceptedAt: true,
        portalLastSeenAt: true,
      },
    })

    // Abrir a aba marca os recados do paciente como lidos.
    await prisma.message.updateMany({
      where: { patientId: id, author: 'PATIENT', readAt: null },
      data: { readAt: new Date() },
    })

    const [messages, documents, materials, tasks, proofs] = await Promise.all([
      prisma.message.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, author: true, body: true, createdAt: true, readAt: true },
      }),
      prisma.document.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true },
      }),
      prisma.material.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, kind: true, url: true, note: true, createdAt: true },
      }),
      prisma.task.findMany({
        where: { patientId: id },
        orderBy: [{ doneAt: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, description: true, dueDate: true, doneAt: true, createdAt: true },
      }),
      prisma.proof.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileName: true, size: true, note: true, paymentId: true, reviewedAt: true, createdAt: true },
      }),
    ])

    return {
      patient,
      portal: {
        enabled: full.portalEnabled,
        hasPassword: Boolean(full.portalPassword),
        acceptedAt: full.portalAcceptedAt,
        lastSeenAt: full.portalLastSeenAt,
      },
      messages,
      documents,
      materials,
      tasks,
      proofs,
    }
  })

  // ---------- Liberar / bloquear o acesso ----------
  app.post('/patients/:id/access', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z.object({ enabled: z.boolean() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos' })

    const patient = await findPatient(request, reply, id)
    if (!patient) return

    await prisma.patient.update({ where: { id }, data: { portalEnabled: parsed.data.enabled } })
    return reply.send({ enabled: parsed.data.enabled })
  })

  // ---------- Senha temporaria (para quando o paciente esquecer) ----------
  app.post('/patients/:id/password', async (request, reply) => {
    const { id } = request.params as { id: string }
    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const password = tempPassword()
    await prisma.patient.update({
      where: { id },
      data: {
        portalEnabled: true,
        portalPassword: await bcrypt.hash(password, 10),
        portalAcceptedAt: new Date(),
      },
    })
    return reply.send({ password })
  })

  // ---------- Voltar ao "primeiro acesso" (paciente cria outra senha) ----------
  app.post('/patients/:id/reset', async (request, reply) => {
    const { id } = request.params as { id: string }
    const patient = await findPatient(request, reply, id)
    if (!patient) return

    await prisma.patient.update({
      where: { id },
      data: { portalPassword: null, portalAcceptedAt: null },
    })
    return reply.send({ ok: true })
  })

  // ---------- Recados ----------
  app.post('/patients/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z.object({ body: z.string().min(1).max(2000) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Escreva um recado' })

    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const message = await prisma.message.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: id,
        author: 'CLINIC',
        body: parsed.data.body,
      },
      select: { id: true, author: true, body: true, createdAt: true, readAt: true },
    })
    return reply.code(201).send(message)
  })

  // ---------- Documentos ----------
  app.post('/patients/:id/documents', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z
      .object({
        title: z.string().min(1),
        kind: z.enum(['CERTIFICATE', 'RECEIPT', 'REPORT', 'OTHER']).optional(),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().int().positive().optional(),
        dataBase64: z.string().min(1),
      })
      .safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Anexe um arquivo e informe um título' })

    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const data = parsed.data
    const buffer = base64ToBuffer(data.dataBase64)
    if (buffer.length === 0) return reply.code(400).send({ error: 'Arquivo vazio' })
    if (buffer.length > MAX_FILE_BYTES) return reply.code(413).send({ error: 'Arquivo muito grande (limite de 5 MB)' })

    const doc = await prisma.document.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: id,
        title: data.title,
        kind: data.kind ?? 'OTHER',
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size || buffer.length,
        data: buffer,
      },
      select: { id: true, title: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true },
    })
    return reply.code(201).send(doc)
  })

  app.delete('/patients/:id/documents/:docId', async (request, reply) => {
    const { id, docId } = request.params as { id: string; docId: string }
    const doc = await prisma.document.findFirst({
      where: { id: docId, patientId: id, clinicId: request.user.clinicId },
    })
    if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

    await prisma.document.delete({ where: { id: docId } })
    return reply.send({ ok: true })
  })

  app.get('/patients/:id/documents/:docId/file', async (request, reply) => {
    const { id, docId } = request.params as { id: string; docId: string }
    const doc = await prisma.document.findFirst({
      where: { id: docId, patientId: id, clinicId: request.user.clinicId },
    })
    if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

    return reply
      .header('Content-Type', doc.mimeType || 'application/octet-stream')
      .header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
      .send(Buffer.from(doc.data))
  })

  // ---------- Materiais recomendados ----------
  app.post('/patients/:id/materials', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z
      .object({
        title: z.string().min(2),
        kind: z.enum(['ARTICLE', 'VÍDEO', 'ÁUDIO', 'LINK']).optional(),
        url: z.string().url(),
        note: z.string().optional(),
      })
      .safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe um título e um link valido' })

    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const material = await prisma.material.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: id,
        title: parsed.data.title,
        kind: parsed.data.kind ?? 'LINK',
        url: parsed.data.url,
        note: parsed.data.note,
      },
      select: { id: true, title: true, kind: true, url: true, note: true, createdAt: true },
    })
    return reply.code(201).send(material)
  })

  app.delete('/patients/:id/materials/:materialId', async (request, reply) => {
    const { id, materialId } = request.params as { id: string; materialId: string }
    const material = await prisma.material.findFirst({
      where: { id: materialId, patientId: id, clinicId: request.user.clinicId },
    })
    if (!material) return reply.code(404).send({ error: 'Material não encontrado' })

    await prisma.material.delete({ where: { id: materialId } })
    return reply.send({ ok: true })
  })

  // ---------- Tarefas entre sessoes ----------
  app.post('/patients/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z
      .object({
        title: z.string().min(2),
        description: z.string().optional(),
        dueDate: z.string().nullable().optional(),
      })
      .safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe o título da tarefa' })

    const patient = await findPatient(request, reply, id)
    if (!patient) return

    const task = await prisma.task.create({
      data: {
        clinicId: request.user.clinicId,
        patientId: id,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00`) : null,
      },
      select: { id: true, title: true, description: true, dueDate: true, doneAt: true, createdAt: true },
    })
    return reply.code(201).send(task)
  })

  app.delete('/patients/:id/tasks/:taskId', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string }
    const task = await prisma.task.findFirst({
      where: { id: taskId, patientId: id, clinicId: request.user.clinicId },
    })
    if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' })

    await prisma.task.delete({ where: { id: taskId } })
    return reply.send({ ok: true })
  })

  // ---------- Comprovantes enviados pelo paciente ----------
  app.get('/proofs/:proofId/file', async (request, reply) => {
    const { proofId } = request.params as { proofId: string }
    const proof = await prisma.proof.findFirst({
      where: { id: proofId, clinicId: request.user.clinicId },
    })
    if (!proof) return reply.code(404).send({ error: 'Comprovante não encontrado' })

    if (!proof.reviewedAt) {
      await prisma.proof.update({ where: { id: proofId }, data: { reviewedAt: new Date() } })
    }

    return reply
      .header('Content-Type', proof.mimeType || 'application/octet-stream')
      .header('Content-Disposition', `inline; filename="${encodeURIComponent(proof.fileName)}"`)
      .send(Buffer.from(proof.data))
  })

  app.post('/proofs/:proofId/review', async (request, reply) => {
    const { proofId } = request.params as { proofId: string }
    const proof = await prisma.proof.findFirst({
      where: { id: proofId, clinicId: request.user.clinicId },
    })
    if (!proof) return reply.code(404).send({ error: 'Comprovante não encontrado' })

    await prisma.proof.update({ where: { id: proofId }, data: { reviewedAt: new Date() } })
    return reply.send({ ok: true })
  })
}

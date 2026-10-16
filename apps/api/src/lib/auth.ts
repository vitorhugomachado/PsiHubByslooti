import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from './prisma'

// Dados do paciente logado, carregados a cada requisicao do portal.
export type PortalPatient = {
  id: string
  clinicId: string
  name: string
  email: string | null
  phone: string
  clinicName: string
  pixKey: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    patient?: PortalPatient
  }
}

// Middleware reutilizavel: valida o JWT e disponibiliza request.user.
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Não autenticado' })
    return
  }
  // Um token do portal do paciente nunca acessa as rotas da clinica.
  if (request.user.role === 'PATIENT') {
    reply.code(403).send({ error: 'Acesso restrito a clínica' })
  }
}

// Middleware do portal: exige token de paciente e confere se o acesso continua
// liberado (desativar o portal derruba as sessoes abertas na hora).
export async function authenticatePatient(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Sessão expirada' })
    return
  }
  if (request.user.role !== 'PATIENT') {
    reply.code(403).send({ error: 'Acesso restrito ao portal do paciente' })
    return
  }

  const patient = await prisma.patient.findFirst({
    where: { id: request.user.sub, deletedAt: null, portalEnabled: true },
    select: {
      id: true,
      clinicId: true,
      name: true,
      email: true,
      phone: true,
      clinic: { select: { name: true, pixKey: true } },
    },
  })

  if (!patient) {
    reply.code(401).send({ error: 'Acesso desativado pela clínica' })
    return
  }

  request.patient = {
    id: patient.id,
    clinicId: patient.clinicId,
    name: patient.name,
    email: patient.email,
    phone: patient.phone ?? '',
    clinicName: patient.clinic.name,
    pixKey: patient.clinic.pixKey,
  }
}

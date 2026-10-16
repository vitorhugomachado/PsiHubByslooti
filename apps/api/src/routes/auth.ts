import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword, generateUniqueSlug } from '../lib/security'
import { authenticate } from '../lib/auth'

const registerSchema = z.object({
  clinicName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // Cria uma clinica + usuario admin e devolve o token.
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados inválidos', details: parsed.error.flatten() })
    }
    const { clinicName, name, email, password } = parsed.data

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return reply.code(409).send({ error: 'E-mail já cadastrado' })

    const slug = await generateUniqueSlug(clinicName)

    const clinic = await prisma.clinic.create({ data: { name: clinicName, slug } })
    const user = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name,
        email,
        passwordHash: hashPassword(password),
        role: 'ADMIN',
      },
    })

    const token = app.jwt.sign({ sub: user.id, clinicId: clinic.id, role: user.role })
    return reply.code(201).send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, clinicId: clinic.id, clinicName: clinic.name },
    })
  })

  // Login por e-mail e senha.
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email }, include: { clinic: true } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({ error: 'E-mail ou senha incorretos' })
    }

    const token = app.jwt.sign({ sub: user.id, clinicId: user.clinicId, role: user.role })
    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic.name,
      },
    })
  })

  // Dados do usuario autenticado.
  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { clinic: true },
    })
    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' })
    return reply.send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      clinicName: user.clinic.name,
    })
  })
}

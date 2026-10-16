import { PrismaClient } from '../generated/prisma'

// Instancia unica do Prisma compartilhada por toda a aplicacao.
export const prisma = new PrismaClient()

import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

// Gera um "slug" unico (usado para identificar a clinica na URL).
export async function generateUniqueSlug(name: string): Promise<string> {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'clinica'

  let slug = base
  let counter = 1
  while (await prisma.clinic.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

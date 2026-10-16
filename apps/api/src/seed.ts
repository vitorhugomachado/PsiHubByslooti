import { prisma } from './lib/prisma'
import { hashPassword } from './lib/security'

// Dados de exemplo para desenvolvimento.
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@psigest.com' } })
  if (existing) {
    console.log('-> Seed já aplicado (usuário admin@psigest.com existe).')
    return
  }

  const clinic = await prisma.clinic.create({
    data: { name: 'Clínica Exemplo', slug: 'clinica-exemplo' },
  })

  const admin = await prisma.user.create({
    data: {
      clinicId: clinic.id,
      name: 'Dra. Ana Psicóloga',
      email: 'admin@psigest.com',
      passwordHash: hashPassword('123456'),
      role: 'ADMIN',
    },
  })

  const [p1, p2, p3] = await Promise.all([
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'Carlos Souza',
        email: 'carlos@email.com',
        phone: '(11) 99999-0001',
        birthDate: new Date(1990, 9, 18, 12),
        document: '123.456.789-00',
        address: 'Rua das Flores, 120 - São Paulo/SP',
        emergencyContact: 'Ana Souza (esposa)',
        emergencyPhone: '(11) 98888-0001',
        referralSource: 'Indicação',
        defaultSessionPrice: 180,
        consentAt: new Date(2026, 5, 12, 12),
        notes: 'Prefere sessões no período da manhã.',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'Mariana Lima',
        email: 'mariana@email.com',
        phone: '(11) 99999-0002',
        birthDate: new Date(1985, 9, 4, 12),
        document: '987.654.321-00',
        address: 'Av. Paulista, 900, ap 52 - São Paulo/SP',
        emergencyContact: 'Rafael Lima (irmão)',
        emergencyPhone: '(11) 98888-0002',
        referralSource: 'Instagram',
        defaultSessionPrice: 200,
        consentAt: new Date(2026, 6, 3, 12),
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'João Pedro Alves',
        phone: '(11) 99999-0003',
        birthDate: new Date(1978, 2, 12, 12),
        emergencyContact: 'Lucia Alves (mãe)',
        emergencyPhone: '(11) 98888-0003',
        referralSource: 'Google',
        defaultSessionPrice: 150,
        consentAt: new Date(2026, 7, 22, 12),
        notes: 'Atendimento a cada 15 dias.',
      },
    }),
  ])

  const today = new Date()
  const at = (h: number) => {
    const d = new Date(today)
    d.setHours(h, 0, 0, 0)
    return d
  }

  await prisma.appointment.createMany({
    data: [
      { clinicId: clinic.id, patientId: p1.id, psychologistId: admin.id, startAt: at(9), endAt: at(10), status: 'CONFIRMED', modality: 'IN_PERSON' },
      { clinicId: clinic.id, patientId: p2.id, psychologistId: admin.id, startAt: at(11), endAt: at(12), status: 'SCHEDULED', modality: 'ONLINE' },
    ],
  })

  // Cobrancas de exemplo: mistura de pagas, pendentes e vencidas ao longo dos meses.
  const day = (offset: number) => {
    const x = new Date(today)
    x.setDate(x.getDate() + offset)
    x.setHours(12, 0, 0, 0)
    return x
  }
  const charge = (
    patientId: string,
    amount: number,
    dueOffset: number,
    status: 'PENDING' | 'PAID' | 'OVERDUE',
    method?: 'PIX' | 'CASH' | 'CARD' | 'TRANSFER',
    description = 'Sessão de psicoterapia',
  ) => ({
    clinicId: clinic.id,
    patientId,
    amount,
    status,
    method: method ?? null,
    description,
    dueDate: day(dueOffset),
    paidAt: status === 'PAID' ? day(dueOffset) : null,
  })

  await prisma.payment.createMany({
    data: [
      charge(p1.id, 180, -95, 'PAID', 'PIX'),
      charge(p2.id, 200, -88, 'PAID', 'CARD'),
      charge(p3.id, 150, -80, 'PAID', 'CASH'),
      charge(p1.id, 180, -66, 'PAID', 'PIX'),
      charge(p2.id, 200, -60, 'PAID', 'PIX'),
      charge(p3.id, 150, -52, 'PAID', 'TRANSFER'),
      charge(p1.id, 180, -35, 'PAID', 'PIX'),
      charge(p2.id, 200, -28, 'PAID', 'CARD'),
      charge(p3.id, 150, -20, 'PAID', 'PIX'),
      charge(p1.id, 180, -12, 'OVERDUE', 'PIX'),
      charge(p2.id, 200, -5, 'OVERDUE', 'CARD'),
      charge(p3.id, 150, 2, 'PENDING', 'PIX'),
      charge(p1.id, 180, 6, 'PENDING', 'PIX'),
      charge(p2.id, 200, 12, 'PENDING', 'CARD'),
    ],
  })

  console.log('-> Seed criado com sucesso!')
  console.log('   Login: admin@psigest.com | Senha: 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

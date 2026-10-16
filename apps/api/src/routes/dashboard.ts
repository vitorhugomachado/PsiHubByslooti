import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../lib/auth'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // Resumo exibido no painel inicial.
  app.get('/summary', async (request, reply) => {
    const clinicId = request.user.clinicId
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const weekEnd = new Date(todayStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [patients, appointmentsToday, appointmentsWeek, pendingPayments, paidThisMonth, inProgress, doneToday, nextAppointment, overduePayments] =
      await Promise.all([
        prisma.patient.count({ where: { clinicId, status: 'ACTIVE' } }),
        prisma.appointment.count({ where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.appointment.count({ where: { clinicId, startAt: { gte: todayStart, lt: weekEnd } } }),
        prisma.payment.count({ where: { clinicId, status: { in: ['PENDING', 'OVERDUE'] } } }),
        prisma.payment.aggregate({
          where: { clinicId, status: 'PAID', paidAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.appointment.count({ where: { clinicId, status: 'IN_PROGRESS' } }),
        prisma.appointment.count({ where: { clinicId, status: 'DONE', startAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.appointment.findFirst({
          where: {
            clinicId,
            startAt: { gte: now },
            status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          },
          orderBy: { startAt: 'asc' },
          include: { patient: { select: { id: true, name: true } } },
        }),
        prisma.payment.count({ where: { clinicId, status: 'OVERDUE' } }),
      ])

    return reply.send({
      patients,
      appointmentsToday,
      appointmentsWeek,
      pendingPayments,
      overduePayments,
      revenueMonth: paidThisMonth._sum.amount || 0,
      inProgress,
      doneToday,
      nextAppointment: nextAppointment
        ? { id: nextAppointment.id, startAt: nextAppointment.startAt, patientName: nextAppointment.patient.name }
        : null,
    })
  })
}

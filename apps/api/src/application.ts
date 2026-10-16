import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { patientRoutes } from './routes/patients'
import { appointmentRoutes } from './routes/appointments'
import { paymentRoutes } from './routes/payments'
import { dashboardRoutes } from './routes/dashboard'
import { portalRoutes } from './routes/portal'
import { portalAdminRoutes } from './routes/portal-admin'
export { authenticate } from './lib/auth'

// Tipagem do payload do JWT.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; clinicId: string; role: string }
    user: { sub: string; clinicId: string; role: string }
  }
}

// Vercel preserves /api when forwarding to this service.
export async function buildApp(createFastify = Fastify) {
  const secret = process.env.JWT_SECRET
  if ((process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') &&
      (!secret || secret === 'dev-secret-inseguro' || secret.length < 32)) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production')
  }
  if (process.env.VERCEL === '1' && !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '')) {
    throw new Error('Vercel requires a persistent PostgreSQL DATABASE_URL')
  }

  const app = createFastify({ logger: true, bodyLimit: Math.floor(4.4 * 1024 * 1024) })
  // Browser requests are same-origin; CORS is only useful for local development.
  await app.register(cors, { origin: process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1' })
  await app.register(jwt, { secret: secret || 'dev-secret-inseguro' })

  await app.register(async (api) => {
    api.get('/health', async () => ({ status: 'ok', service: 'psihub-api' }))
    await api.register(authRoutes, { prefix: '/' })
    await api.register(patientRoutes, { prefix: '/patients' })
    await api.register(appointmentRoutes, { prefix: '/appointments' })
    await api.register(paymentRoutes, { prefix: '/payments' })
    await api.register(dashboardRoutes, { prefix: '/dashboard' })
    await api.register(portalRoutes, { prefix: '/portal' })
    await api.register(portalAdminRoutes, { prefix: '/portal-admin' })
  }, { prefix: '/api' })

  return app
}

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

// O portal do paciente envia arquivos (comprovantes/documentos) em base64.
const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 })

await app.register(cors, { origin: true })

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-inseguro',
})

app.get('/health', async () => ({ status: 'ok', service: 'psihub-api' }))

await app.register(authRoutes, { prefix: '/' })
await app.register(patientRoutes, { prefix: '/patients' })
await app.register(appointmentRoutes, { prefix: '/appointments' })
await app.register(paymentRoutes, { prefix: '/payments' })
await app.register(dashboardRoutes, { prefix: '/dashboard' })
await app.register(portalRoutes, { prefix: '/portal' })
await app.register(portalAdminRoutes, { prefix: '/portal-admin' })

const port = Number(process.env.PORT) || 3000

try {
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info(`API rodando em http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

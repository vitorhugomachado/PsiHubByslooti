import Fastify from 'fastify'
import { buildApp } from './application'

// Keep the framework import in the entrypoint for Vercel's detector.
const app = await buildApp(Fastify)
const port = Number(process.env.PORT) || 3000

// Vercel intercepts listen(); do not block the entrypoint import on its promise.
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from './application'

test('public /api routes preserve authentication, queries and JSON errors', async () => {
  const app = await buildApp()
  try {
    const health = await app.inject('/api/health?probe=vercel')
    assert.equal(health.statusCode, 200)
    assert.equal(health.json().service, 'psihub-api')

    for (const url of ['/api/patients?search=Carlos', '/api/appointments', '/api/payments',
      '/api/dashboard/summary', '/api/portal/me', '/api/portal-admin/summary']) {
      assert.equal((await app.inject(url)).statusCode, 401, url)
    }
    for (const url of ['/api/auth/login', '/api/auth/register', '/api/portal/login', '/api/portal/register']) {
      assert.equal((await app.inject({ method: 'POST', url, payload: {} })).statusCode, 400, url)
    }
    const missing = await app.inject('/api/not-found')
    assert.equal(missing.statusCode, 404)
    assert.match(missing.headers['content-type']!, /application\/json/)
    assert.equal((await app.inject('/health')).statusCode, 404)
  } finally {
    await app.close()
  }
})

test('Vercel refuses a development JWT secret and a local database', async () => {
  const original = { VERCEL: process.env.VERCEL, JWT_SECRET: process.env.JWT_SECRET, DATABASE_URL: process.env.DATABASE_URL }
  try {
    process.env.VERCEL = '1'
    delete process.env.JWT_SECRET
    await assert.rejects(buildApp(), /JWT_SECRET/)
    process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters'
    process.env.DATABASE_URL = 'file:./dev.db'
    await assert.rejects(buildApp(), /PostgreSQL/)
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

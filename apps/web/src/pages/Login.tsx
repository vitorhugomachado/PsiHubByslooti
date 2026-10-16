import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button, Input, Label } from '../components/ui'
import { Logo } from '../components/Logo'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-cream p-4">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-50" />

      <div className="relative grid w-full max-w-4xl items-center gap-8 lg:grid-cols-2">
        {/* Hero */}
        <div className="hidden lg:block">
          <div className="mb-6">
            <Logo size={88} withBy />
          </div>
          <h1 className="title-chips font-display text-5xl uppercase leading-[1.18] tracking-normal text-balance text-ink">
            CUIDE DAS{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word -rotate-2 bg-brand text-white">PESSOAS</span>,
            </span>{' '}
            A GENTE CUIDA DA{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word rotate-1 bg-sun">BAGUNÇA</span>.
            </span>
          </h1>
          <p className="mt-4 max-w-sm font-round text-lg font-semibold text-ink/70">
            Pacientes, agenda e financeiro do seu consultorio num só lugar. Simples, bonito e do seu jeito.
          </p>
        </div>

        {/* Formulario */}
        <div className="mx-auto w-full max-w-sm">
          <div className="sticker-lg rounded-3xl bg-white p-6">
            <div className="mb-5 flex flex-col items-center text-center lg:hidden">
              <Logo size={64} className="mb-3" />
              <p className="font-round text-sm font-semibold text-ink/60">Entre na sua conta</p>
            </div>
            <h2 className="mb-4 hidden font-display text-2xl uppercase tracking-wide lg:block">Entrar</h2>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-4 text-center font-round text-sm font-semibold text-ink/60">
              Não tem conta?{' '}
              <Link to="/cadastro" className="font-bold text-brand hover:underline">
                Cadastre sua clínica
              </Link>
            </p>

            <p className="mt-3 border-t border-dashed border-ink/15 pt-3 text-center font-round text-xs font-semibold text-ink/50">
              E paciente?{' '}
              <Link to="/portal/login" className="font-bold text-hub hover:underline">
                Acesse o portal do paciente
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

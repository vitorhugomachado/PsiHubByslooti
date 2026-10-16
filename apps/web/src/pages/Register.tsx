import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button, Input, Label } from '../components/ui'
import { Logo } from '../components/Logo'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [clinicName, setClinicName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(clinicName, name, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
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
            COMECE A{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word -rotate-2 bg-brand text-white">ORGANIZAR</span>
            </span>{' '}
            SEU CONSULTORIO{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word rotate-1 bg-sun">HOJE</span>.
            </span>
          </h1>
        </div>

        {/* Formulario */}
        <div className="mx-auto w-full max-w-sm">
          <div className="sticker-lg rounded-3xl bg-white p-6">
            <div className="mb-5 flex flex-col items-center text-center lg:hidden">
              <Logo size={56} className="mb-3" />
              <h1 className="font-display text-3xl uppercase tracking-wide">Criar conta</h1>
            </div>
            <h2 className="mb-4 hidden font-display text-2xl uppercase tracking-wide lg:block">Criar conta</h2>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}
              <div>
                <Label>Nome da clínica / consultorio</Label>
                <Input required value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Ex: Clínica Bem Estar" />
              </div>
              <div>
                <Label>Seu nome</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dra. Ana Silva" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <Button type="submit" variant="sun" disabled={loading} className="w-full">
                {loading ? 'Criando...' : 'Criar conta'}
              </Button>
            </form>

            <p className="mt-4 text-center font-round text-sm font-semibold text-ink/60">
              Já tem conta?{' '}
              <Link to="/login" className="font-bold text-brand hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

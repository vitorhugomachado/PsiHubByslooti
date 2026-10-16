import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Input, Label } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { getPortalToken, portalFetch, setPortalSession, type PortalPatient } from '../../lib/portal'

/* ============================================================================
   Entrada do paciente no portal: login normal e "primeiro acesso"
   (o paciente cria a propria senha, com o e-mail que a clinica cadastrou).
   ========================================================================== */

export function PortalLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'first'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getPortalToken()) return <Navigate to="/portal" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'first' && password !== confirm) {
      setError('As duas senhas precisam ser iguais')
      return
    }

    setLoading(true)
    try {
      const res = await portalFetch<{ token: string; patient: PortalPatient }>(
        mode === 'login' ? '/login' : '/register',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      )
      setPortalSession(res.token, res.patient)
      navigate('/portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar')
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
            SUAS{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word -rotate-2 bg-hub text-white">SESSÕES</span>,
            </span>{' '}
            SEUS PAGAMENTOS E OS{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word rotate-1 bg-sun">RECADOS</span>
            </span>{' '}
            NUM SÓ LUGAR.
          </h1>
          <p className="mt-4 max-w-sm font-round text-lg font-semibold text-ink/70">
            Aqui você confirma presença, entra na sessão online, envia o comprovante e fala com seu psicólogo.
          </p>
        </div>

        {/* Formulario */}
        <div className="mx-auto w-full max-w-sm">
          <div className="sticker-lg rounded-3xl bg-white p-6">
            <div className="mb-5 flex flex-col items-center text-center lg:hidden">
              <Logo size={62} className="mb-3" />
              <p className="font-round text-sm font-semibold text-ink/60">Portal do paciente</p>
            </div>

            <h2 className="hidden font-display text-2xl uppercase tracking-wide lg:block">Portal do paciente</h2>

            {/* Alterna entre entrar e primeiro acesso */}
            <div className="my-4 grid grid-cols-2 gap-1 rounded-2xl border border-ink bg-cream p-1">
              {(
                [
                  { id: 'login', label: 'Entrar' },
                  { id: 'first', label: 'Primeiro acesso' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMode(t.id)
                    setError('')
                  }}
                  className={`rounded-xl px-2 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide transition ${
                    mode === t.id ? 'border border-ink bg-white text-ink shadow-ink' : 'text-ink/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>
              )}

              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>

              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                />
              </div>

              {mode === 'first' && (
                <div>
                  <Label>Repita a senha</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="repita a senha"
                  />
                </div>
              )}

              <Button type="submit" disabled={loading} variant={mode === 'first' ? 'sun' : 'primary'} className="w-full">
                {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar minha senha'}
              </Button>
            </form>

            <p className="mt-4 text-center font-round text-xs font-semibold leading-relaxed text-ink/55">
              {mode === 'login'
                ? 'Esqueceu a senha? Peca ao seu psicólogo para gerar uma nova.'
                : 'Use o mesmo e-mail que o seu psicólogo cadastrou. O acesso precisa estar liberado por ele.'}
            </p>
          </div>

          <p className="mt-4 text-center font-round text-xs font-semibold text-ink/45">
            E psicólogo?{' '}
            <Link to="/login" className="font-bold text-ink/70 underline decoration-dotted">
              Acesse o painel
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

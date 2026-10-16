import { type ReactNode } from 'react'
import { NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import {
  PortalError,
  clearPortalSession,
  getPortalPatient,
  getPortalToken,
  portalFetch,
  type PortalOverview,
} from '../../lib/portal'

/* ============================================================================
   Moldura do portal do paciente: cabecalho, navegacao inferior (celular) e
   barra lateral (desktop). Tudo com a mesma linguagem visual do app.
   ========================================================================== */

const NAV = [
  { to: '/portal', label: 'Início', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/portal/sessoes', label: 'Sessões', icon: 'M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { to: '/portal/financeiro', label: 'Financeiro', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { to: '/portal/recados', label: 'Recados', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { to: '/portal/mais', label: 'Mais', icon: 'M12 6h.01M12 12h.01M12 18h.01' },
]

function Icon({ path, size = 20 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export function PortalLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const patient = getPortalPatient()
  const token = getPortalToken()

  const { data: overview, error } = useQuery({
    queryKey: ['portalOverview'],
    queryFn: () => portalFetch<PortalOverview>('/overview'),
    enabled: Boolean(token),
  })

  const unauthorized = error instanceof PortalError && error.status === 401

  if (!token || unauthorized) {
    clearPortalSession()
    return <Navigate to="/portal/login" replace />
  }

  const initials = (patient?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  function logout() {
    clearPortalSession()
    navigate('/portal/login')
  }

  return (
    <div className="flex min-h-full">
      {/* Barra lateral (desktop) */}
      <aside className="hidden w-64 flex-col border-r border-ink bg-white/70 p-4 lg:flex">
        <div className="sticker mb-6 rounded-2xl bg-white p-3">
          <Logo size={64} />
          <p className="mt-2.5 border-t border-dashed border-ink/20 pt-2 font-round text-[11px] font-bold uppercase tracking-wide text-ink/50">
            Portal do paciente
          </p>
          <p className="mt-1 truncate font-round text-xs font-bold text-ink/60">{patient?.clinicName}</p>
        </div>

        <nav className="space-y-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 font-round text-sm font-bold uppercase tracking-wide transition ${
                  isActive ? 'border-ink bg-brand text-white shadow-ink' : 'border-transparent text-ink/70 hover:border-ink hover:bg-white'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon path={item.icon} />
                {item.label}
              </span>
              {item.to === '/portal/recados' && (overview?.unreadMessages || 0) > 0 && (
                <span className="rounded-full border border-ink bg-pop px-2 font-round text-[10px] font-bold text-white">
                  {overview?.unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-ink pt-4">
          <p className="truncate px-1 font-round text-sm font-bold text-ink">{patient?.name}</p>
          <p className="truncate px-1 text-xs text-ink/50">{patient?.email}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-2xl border border-ink bg-white px-3 py-2 font-round text-sm font-bold uppercase tracking-wide text-ink shadow-ink transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Cabecalho */}
        <header className="flex items-center justify-between border-b border-ink bg-white px-4 py-3 lg:px-8">
          <div className="lg:hidden">
            <Logo size={32} />
          </div>
          <div className="hidden lg:block">
            <p className="font-display text-2xl uppercase leading-none tracking-wide text-ink">Olá, {patient?.name?.split(' ')[0]}</p>
            <p className="mt-0.5 font-round text-xs font-bold uppercase tracking-wide text-ink/40">{patient?.clinicName}</p>
          </div>
          <button
            onClick={() => navigate('/portal/mais')}
            title="Meu perfil"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink bg-brand font-round text-sm font-extrabold text-white shadow-ink lg:hidden"
          >
            {initials}
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            {overview?.next && (
              <span className="rounded-full border border-ink bg-brand-light px-3 py-1 font-round text-[11px] font-bold uppercase tracking-wide text-ink">
                Próxima sessão: {new Date(overview.next.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink bg-brand font-round text-xs font-extrabold text-white shadow-ink">
              {initials}
            </span>
          </div>
        </header>

        <main className="relative flex-1 p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
          <div className="relative mx-auto max-w-3xl">{children}</div>
        </main>
      </div>

      {/* Navegacao inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink bg-white lg:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/portal'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-1 py-2.5 font-round text-[10px] font-bold uppercase tracking-wide transition ${
                isActive ? 'text-brand' : 'text-ink/45'
              }`
            }
          >
            <span className="relative">
              <Icon path={item.icon} size={22} />
              {item.to === '/portal/recados' && (overview?.unreadMessages || 0) > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-ink bg-pop px-1 text-[9px] font-bold text-white">
                  {overview?.unreadMessages}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

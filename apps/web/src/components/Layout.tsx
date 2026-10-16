import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Logo, SlootiMark } from './Logo'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/pacientes', label: 'Pacientes', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { to: '/agenda', label: 'Agenda', icon: 'M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { to: '/financeiro', label: 'Financeiro', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
]

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

function Burger({ onClick, aberto }: { onClick: () => void; aberto: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={aberto ? 'Recolher menu' : 'Fixar menu aberto'}
      aria-expanded={aberto}
      className="shrink-0 rounded-xl border border-ink bg-sun p-2 text-ink shadow-ink transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>
  )
}

function NavItems({
  expandido,
  onNavigate,
  alertaPacientes = 0,
}: {
  expandido: boolean
  onNavigate?: () => void
  /** Pendencias do portal (comprovantes/recados) viram uma bolinha em Pacientes. */
  alertaPacientes?: number
}) {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const temAlerta = item.to === '/pacientes' && alertaPacientes > 0
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center rounded-2xl border py-2 font-round text-sm font-bold uppercase tracking-wide transition ${
                expandido ? 'gap-3 px-3' : 'justify-center px-0'
              } ${isActive ? 'border-ink bg-brand text-white shadow-ink' : 'border-transparent text-ink/70 hover:border-ink hover:bg-white'}`
            }
          >
            <span className="relative">
              <Icon path={item.icon} />
              {temAlerta && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-ink bg-pop" />}
            </span>
            {expandido && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const expandido = hovered || pinned

  // Pendencias do portal (mesma consulta do painel: o cache e compartilhado).
  const { data: portal } = useQuery({
    queryKey: ['portalSummary'],
    queryFn: () => apiFetch<{ unreadMessages: number; newProofs: number }>('/portal-admin/summary'),
    refetchInterval: 60_000,
  })
  const alertaPacientes = (portal?.newProofs ?? 0) + (portal?.unreadMessages ?? 0)

  const sair = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-full">
      {/* Menu lateral (desktop): rail fino que abre no hover (ou fica fixo no clique) */}
      <aside
        data-aberto={expandido}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={(e) => {
          if ((e.target as HTMLElement).matches?.(':focus-visible')) setHovered(true)
        }}
        onBlurCapture={() => setHovered(false)}
        className="rail-menu fixed inset-y-0 left-0 z-[45] hidden flex-col border-r border-ink bg-white/95 p-3 backdrop-blur lg:flex"
      >
        {expandido ? (
          <div className="sticker mb-6 rounded-2xl bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <Logo size={64} />
              <Burger onClick={() => setPinned((v) => !v)} aberto={pinned} />
            </div>
            <p className="mt-2.5 truncate border-t border-dashed border-ink/20 pt-2 font-round text-xs font-bold text-ink/60">
              {user?.clinicName}
            </p>
          </div>
        ) : (
          <div className="mb-6 flex justify-center">
            <Burger onClick={() => setPinned(true)} aberto={false} />
          </div>
        )}

        <NavItems expandido={expandido} alertaPacientes={alertaPacientes} />

        <div className="mt-auto">
          {expandido ? (
            <div className="border-t border-ink pt-4">
              <p className="truncate px-1 font-round text-sm font-bold text-ink">{user?.name}</p>
              <p className="truncate px-1 text-xs text-ink/50">{user?.email}</p>
              <button
                onClick={sair}
                className="mt-3 w-full rounded-2xl border border-ink bg-pop px-3 py-2 font-round text-sm font-bold uppercase tracking-wide text-white shadow-ink transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                Sair
              </button>
              <div className="mt-3 flex justify-center">
                <SlootiMark className="text-[10px] text-ink/40" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={sair}
                title="Sair"
                aria-label="Sair"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink bg-pop text-white shadow-ink transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
              <SlootiMark compact className="mt-2.5 text-[11px] text-ink/40" />
            </div>
          )}
        </div>
      </aside>

      {/* Conteudo: no celular usa a barra de topo com hamburguer; no desktop reserva o rail */}
      <div className="flex min-h-full flex-col lg:pl-[76px]">
        <header className="flex items-center justify-between border-b border-ink bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo size={34} />
          </div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            className="rounded-xl border border-ink bg-sun p-2 text-ink shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </header>

        {menuOpen && (
          <div className="border-b border-ink bg-cream p-4 lg:hidden">
            <NavItems expandido alertaPacientes={alertaPacientes} onNavigate={() => setMenuOpen(false)} />
            <button
              onClick={sair}
              className="mt-3 w-full rounded-2xl border border-ink bg-pop px-3 py-2 font-round text-sm font-bold uppercase tracking-wide text-white shadow-ink"
            >
              Sair
            </button>
            <div className="mt-3 flex justify-center">
              <SlootiMark className="text-[10px] text-ink/40" />
            </div>
          </div>
        )}

        <main className="relative flex-1 p-4 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  )
}

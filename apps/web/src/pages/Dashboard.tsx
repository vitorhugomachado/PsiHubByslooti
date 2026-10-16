import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import type { Appointment, DashboardSummary } from '../types'
import { Button, Spinner } from '../components/ui'
import { formatTime } from '../lib/format'
import { mailtoLink, meetMessage, relativeToStart, sessionElapsed, whatsappLink } from '../lib/session'
import { useAuth } from '../lib/auth'
import { capitalize, formatDayLong } from '../lib/date'
import { DayTimeline } from '../components/dashboard/DayTimeline'

type PortalSummary = {
  unreadMessages: number
  newProofs: number
  portalPatients: number
  pendingTasks: number
}

function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* "Dra. Ana Psicologa" -> "Ana" (remove titulos e usa o primeiro nome). */
function firstName(name?: string | null): string {
  if (!name) return 'doutor(a)'
  const cleaned = name.replace(/^(dra?\.?|prof\.?|psic[oó]?l?\.?)\s+/i, '').trim()
  return cleaned.split(/\s+/)[0] || name
}

/* Faixa de pendencias: aparece somente quando ha algo esperando a clinica. */
function AttentionStrip({
  newProofs,
  unreadMessages,
  overduePayments,
}: {
  newProofs: number
  unreadMessages: number
  overduePayments: number
}) {
  const navigate = useNavigate()
  const itens: { texto: string; destino: string; tom: string }[] = []
  if (newProofs > 0) itens.push({ texto: `${newProofs} comprovante(s) para conferir`, destino: '/pacientes', tom: 'bg-sun' })
  if (unreadMessages > 0) itens.push({ texto: `${unreadMessages} recado(s) novo(s)`, destino: '/pacientes', tom: 'bg-white' })
  if (overduePayments > 0) itens.push({ texto: `${overduePayments} pagamento(s) vencido(s)`, destino: '/financeiro', tom: 'bg-white' })

  if (itens.length === 0) return null

  return (
    <div className="mt-6">
      <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/50">Precisa de atenção</p>
      <div className="flex flex-wrap gap-2">
        {itens.map((item) => (
          <button
            key={item.texto}
            onClick={() => navigate(item.destino)}
            className={`sticker sticker-press rounded-full px-4 py-2 font-round text-sm font-bold text-ink ${item.tom}`}
          >
            {item.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Atualiza o relogio (para o timer da sessao e a proxima sessao).
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 60_000,
  })

  const { data: portal } = useQuery({
    queryKey: ['portalSummary'],
    queryFn: () => apiFetch<PortalSummary>('/portal-admin/summary'),
    refetchInterval: 60_000,
  })

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const dayKey = dayStart.toISOString().slice(0, 10)

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', 'today', dayKey],
    queryFn: () => apiFetch<Appointment[]>(`/appointments?from=${dayStart.toISOString()}&to=${dayEnd.toISOString()}`),
  })

  // Ordena por horario (a API ja ordena, mas garantimos independente de cache).
  const todayAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments],
  )

  const inProgress = todayAppointments.find((a) => a.status === 'IN_PROGRESS') || null
  const next = todayAppointments.find((a) => {
    const s = new Date(a.startAt).getTime()
    return s > now.getTime() && ['SCHEDULED', 'CONFIRMED'].includes(a.status)
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['appointments'] })
  }

  const startM = useMutation({
    mutationFn: (id: string) => apiFetch<Appointment>(`/appointments/${id}/start`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })
  const finishM = useMutation({
    mutationFn: (id: string) => apiFetch<Appointment>(`/appointments/${id}/finish`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })
  const meetM = useMutation({
    mutationFn: (id: string) => apiFetch<Appointment>(`/appointments/${id}/meet`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })

  async function run(id: string, fn: () => Promise<unknown>) {
    setPendingId(id)
    try {
      await fn()
    } finally {
      setPendingId(null)
    }
  }

  function openCall(a: Appointment) {
    if (a.meetLink) {
      window.open(a.meetLink, '_blank', 'noopener')
      return
    }
    run(a.id, async () => {
      const updated = await meetM.mutateAsync(a.id)
      if (updated.meetLink) window.open(updated.meetLink, '_blank', 'noopener')
    })
  }

  async function copyLink(a: Appointment) {
    if (!a.meetLink) return
    try {
      await navigator.clipboard.writeText(a.meetLink)
      setCopiedId(a.id)
      setTimeout(() => setCopiedId((c) => (c === a.id ? null : c)), 2500)
    } catch {
      /* ignora ambientes sem permissao de area de transferencia */
    }
  }

  function openInAgenda(a: Appointment) {
    const date = new Date(a.startAt).toISOString().slice(0, 10)
    navigate(`/agenda?date=${date}`)
  }

  const clinicName = user?.clinicName || 'Psi Hub'
  const message = (a: Appointment) => meetMessage(a, clinicName)
  const shareWhatsApp = (a: Appointment) => (a.meetLink ? whatsappLink(a.patient?.phone, message(a)) : null)
  const shareEmail = (a: Appointment) =>
    a.meetLink ? mailtoLink(a.patient?.email, 'Sua sessão online', message(a)) : null

  if (isLoading) return <Spinner />

  const doneToday = summary?.doneToday ?? 0
  const totalToday = summary?.appointmentsToday ?? 0

  return (
    <div>
      {/* Cabecalho: quem sou eu e como esta o meu dia */}
      <div className="mb-5">
        <p className="font-round text-sm font-bold uppercase tracking-wide text-brand">{capitalize(formatDayLong(now))}</p>
        <h1 className="mt-1 font-display text-3xl uppercase leading-none tracking-wide text-ink sm:text-4xl">
          {greeting(now.getHours())}, {firstName(user?.name)}
        </h1>
        <p className="mt-2 font-round text-sm font-semibold text-ink/60">
          {totalToday === 0
            ? 'Nenhuma sessão agendada para hoje.'
            : `${totalToday} sessão(ões) hoje · ${doneToday} realizada(s) · ${Math.max(0, totalToday - doneToday)} a seguir`}
        </p>
      </div>

      {/* O que precisa de mim agora: sessao em andamento ou a proxima */}
      {inProgress ? (
        <div className="sticker rounded-3xl bg-sun p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="min-w-0">
              <p className="font-round text-[11px] font-bold uppercase tracking-wide text-ink/60">Sessão em andamento</p>
              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="font-display text-4xl leading-none tracking-wide text-ink">{sessionElapsed(inProgress, now) ?? '—'}</p>
                <div className="pb-0.5">
                  <p className="font-round text-base font-bold leading-tight text-ink">{inProgress.patient?.name || 'Paciente'}</p>
                  <p className="font-round text-xs font-semibold text-ink/60">
                    iniciada às {formatTime(inProgress.sessionStartedAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => openCall(inProgress)} disabled={pendingId === inProgress.id}>
                Entrar na call
              </Button>
              <Button
                variant="danger"
                onClick={() => run(inProgress.id, () => finishM.mutateAsync(inProgress.id))}
                disabled={pendingId === inProgress.id}
              >
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      ) : next ? (
        <div className="sticker rounded-3xl bg-brand p-4 text-white">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="min-w-0">
              <p className="font-round text-[11px] font-bold uppercase tracking-wide opacity-80">A seguir</p>
              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="font-display text-4xl leading-none tracking-wide">{formatTime(next.startAt)}</p>
                <div className="pb-0.5">
                  <p className="font-round text-base font-bold leading-tight">{next.patient?.name || 'Paciente'}</p>
                  <p className="font-round text-xs font-semibold opacity-80">
                    {relativeToStart(next.startAt, now).label} · {next.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="sun"
                onClick={() => run(next.id, () => startM.mutateAsync(next.id))}
                disabled={pendingId === next.id}
              >
                {pendingId === next.id ? 'Iniciando...' : 'Iniciar sessão'}
              </Button>
              <Button variant="secondary" onClick={() => openCall(next)} disabled={pendingId === next.id}>
                {next.meetLink ? 'Entrar na call' : 'Gerar link'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sticker rounded-3xl bg-white px-4 py-3">
          <p className="font-round text-sm font-semibold text-ink/60">Nenhuma sessão pendente hoje. Bom descanso! 🌿</p>
        </div>
      )}

      <AttentionStrip
        newProofs={portal?.newProofs ?? 0}
        unreadMessages={portal?.unreadMessages ?? 0}
        overduePayments={summary?.overduePayments ?? 0}
      />

      {/* Linha do tempo do dia (largura total) */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase tracking-wide text-ink">Linha do tempo do dia</h2>
          <button
            onClick={() => navigate('/agenda')}
            className="rounded-full border border-ink bg-white px-3 py-1 font-round text-xs font-bold uppercase tracking-wide shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Agenda completa
          </button>
        </div>
        {loadingAppointments ? (
          <Spinner />
        ) : (
          <DayTimeline
            appointments={todayAppointments}
            now={now}
            pendingId={pendingId}
            copiedId={copiedId}
            onOpenCall={openCall}
            onStart={(a) => run(a.id, () => startM.mutateAsync(a.id))}
            onFinish={(a) => run(a.id, () => finishM.mutateAsync(a.id))}
            onCopy={copyLink}
            onShareWhatsApp={shareWhatsApp}
            onShareEmail={shareEmail}
            onOpenInAgenda={openInAgenda}
          />
        )}
      </div>
    </div>
  )
}

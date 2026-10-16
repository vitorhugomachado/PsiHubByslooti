import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, EmptyState, Spinner } from '../../components/ui'
import { SessionCard } from '../../components/portal/SessionCard'
import { formatDate, formatTime } from '../../lib/format'
import {
  SESSION_STATUS_META,
  getPortalPatient,
  isUpcoming,
  portalFetch,
  type PortalAppointment,
} from '../../lib/portal'

/* ============================================================================
   Sessoes: as que vao acontecer (com as acoes) e o historico enxuto —
   so data, profissional e status. Nada de conteudo clinico aqui.
   ========================================================================== */

export function PortalSessions() {
  const qc = useQueryClient()
  const patient = getPortalPatient()

  const { data, isLoading } = useQuery({
    queryKey: ['portalAppointments'],
    queryFn: () => portalFetch<PortalAppointment[]>('/appointments'),
  })

  const confirm = useMutation({
    mutationFn: (id: string) => portalFetch(`/appointments/${id}/confirm`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portalAppointments'] })
      qc.invalidateQueries({ queryKey: ['portalOverview'] })
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Não foi possível confirmar'),
  })

  if (isLoading) return <Spinner />

  const list = data ?? []
  const upcoming = list.filter(isUpcoming).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const history = list.filter((a) => !isUpcoming(a))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink">Minhas sessões</h1>
        <p className="mt-1 font-round text-sm font-semibold text-ink/55">
          {upcoming.length ? `${upcoming.length} sessão(oes) por vir` : 'Nenhuma sessão marcada no momento'}
        </p>
      </div>

      <section className="space-y-3">
        {upcoming.length === 0 && (
          <EmptyState title="Sem sessões agendadas" description="Assim que seu psicólogo marcar, a sessão aparece aqui com o link de acesso." />
        )}
        {upcoming.map((a, i) => (
          <SessionCard
            key={a.id}
            appointment={a}
            clinicName={patient?.clinicName || 'Psi Hub'}
            onConfirm={(id) => confirm.mutate(id)}
            confirming={confirm.isPending}
            highlight={i === 0}
          />
        ))}
      </section>

      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Histórico</p>
        {history.length === 0 ? (
          <p className="font-round text-sm font-semibold text-ink/45">Ainda não há sessões anteriores.</p>
        ) : (
          <div className="sticker divide-y-2 divide-dashed divide-ink/10 overflow-hidden rounded-3xl bg-white">
            {history.map((a) => {
              const meta = SESSION_STATUS_META[a.status] ?? { label: a.status, tone: 'bg-slate-200 text-ink' }
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-round text-sm font-bold text-ink">
                      {formatDate(a.startAt)} <span className="font-semibold text-ink/50">as {formatTime(a.startAt)}</span>
                    </p>
                    <p className="font-round text-[11px] font-semibold text-ink/45">
                      {a.professional} · {a.modality === 'ONLINE' ? 'Online' : 'Presencial'} · {a.durationMin} min
                    </p>
                  </div>
                  <Badge color={a.status === 'NO_SHOW' ? 'red' : a.status === 'DONE' ? 'green' : 'slate'}>{meta.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-2 font-round text-[11px] font-semibold text-ink/40">
          Sobre o conteúdo das sessões, fale diretamente com o seu psicólogo.
        </p>
      </section>
    </div>
  )
}

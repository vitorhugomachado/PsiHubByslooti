import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Card, EmptyState, Spinner } from '../../components/ui'
import { SessionCard } from '../../components/portal/SessionCard'
import { formatMoney } from '../../lib/finance'
import { getPortalPatient, portalFetch, type PortalOverview } from '../../lib/portal'

/* ============================================================================
   Inicio do portal: proxima sessao, pendencias e atalhos.
   ========================================================================== */

function Shortcut({ to, icon, title, hint, tone }: { to: string; icon: string; title: string; hint: string; tone: string }) {
  return (
    <Link to={to} className={`sticker sticker-press flex items-start gap-3 rounded-2xl p-3 ${tone}`}>
      <span className="text-xl leading-none">{icon}</span>
      <span className="min-w-0">
        <span className="block font-round text-xs font-bold uppercase tracking-wide text-ink">{title}</span>
        <span className="mt-0.5 block font-round text-[11px] font-semibold text-ink/60">{hint}</span>
      </span>
    </Link>
  )
}

export function PortalHome() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const patient = getPortalPatient()

  const { data, isLoading } = useQuery({
    queryKey: ['portalOverview'],
    queryFn: () => portalFetch<PortalOverview>('/overview'),
  })

  const confirm = useMutation({
    mutationFn: (id: string) => portalFetch(`/appointments/${id}/confirm`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portalOverview'] })
      qc.invalidateQueries({ queryKey: ['portalAppointments'] })
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Não foi possível confirmar'),
  })

  if (isLoading) return <Spinner />

  const firstName = (patient?.name || '').split(' ')[0]

  return (
    <div className="space-y-5">
      <div className="lg:hidden">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink">Olá, {firstName}!</h1>
        <p className="mt-1 font-round text-sm font-semibold text-ink/55">
          {data?.next ? 'Tudo pronto para a sua próxima sessão.' : 'Aqui você acompanha suas sessões, pagamentos e recados.'}
        </p>
      </div>

      {/* Proxima sessao */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Próxima sessão</p>
        {data?.next ? (
          <SessionCard
            appointment={data.next}
            clinicName={patient?.clinicName || 'Psi Hub'}
            onConfirm={(id) => confirm.mutate(id)}
            confirming={confirm.isPending}
            highlight
          />
        ) : (
          <EmptyState title="Nenhuma sessão agendada" description="Quando seu psicólogo marcar a próxima sessão, ela aparece aqui." />
        )}
      </section>

      {/* Pendencias */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Resumo</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/portal/financeiro" className="sticker sticker-press rounded-2xl bg-white p-4">
            <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {data && data.overdueAmount > 0 ? 'Em atraso' : 'Em aberto'}
            </p>
            <p className={`mt-1 font-display text-2xl leading-none tracking-wide ${data && data.overdueAmount > 0 ? 'text-pop' : 'text-ink'}`}>
              {formatMoney(data?.openAmount || 0)}
            </p>
            <p className="mt-1 font-round text-[11px] font-semibold text-ink/55">
              {data?.openCount ? `${data.openCount} cobrança(s)` : 'nada em aberto'}
            </p>
          </Link>

          <Link to="/portal/recados" className="sticker sticker-press rounded-2xl bg-white p-4">
            <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">Recados novos</p>
            <p className="mt-1 font-display text-2xl leading-none tracking-wide text-ink">{data?.unreadMessages ?? 0}</p>
            <p className="mt-1 font-round text-[11px] font-semibold text-ink/55">
              {data?.unreadMessages ? 'toque para ler' : 'tudo lido'}
            </p>
          </Link>

          <Link to="/portal/mais" className="sticker sticker-press rounded-2xl bg-white p-4">
            <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">Tarefas a fazer</p>
            <p className="mt-1 font-display text-2xl leading-none tracking-wide text-ink">{data?.pendingTasks ?? 0}</p>
            <p className="mt-1 font-round text-[11px] font-semibold text-ink/55">
              {data?.materials ? `${data.materials} material(is) para você` : 'sem tarefas pendentes'}
            </p>
          </Link>
        </div>
      </section>

      {/* Atalhos */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Atalhos</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Shortcut
            to="/portal/sessoes"
            icon="🗓️"
            title="Minhas sessões"
            hint={data?.upcoming ? `${data.upcoming} sessão(oes) por vir` : 'veja o histórico'}
            tone="bg-brand-light"
          />
          <Shortcut
            to="/portal/financeiro"
            icon="💳"
            title="Pagar sessão"
            hint={patient?.pixKey ? 'PIX e comprovante' : 'veja suas cobranças'}
            tone="bg-sun"
          />
          <Shortcut
            to="/portal/recados"
            icon="💬"
            title="Falar com o psicólogo"
            hint="mande um recado"
            tone="bg-white"
          />
          <Shortcut
            to="/portal/mais"
            icon="📋"
            title="Tarefas e materiais"
            hint={data?.materials ? `${data.materials} material(is) recomendado(s)` : 'dúvidas e dados cadastrais'}
            tone="bg-white"
          />
        </div>
      </section>

      {!patient?.email && (
        <Card className="p-4">
          <p className="font-round text-sm font-bold text-ink">Complete seu cadastro</p>
          <p className="mt-1 font-round text-xs font-semibold text-ink/55">
            Cadastre um e-mail em "Mais" para receber os avisos do portal.
          </p>
          <button
            onClick={() => navigate('/portal/mais')}
            className="mt-3 rounded-full border border-ink bg-white px-4 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink"
          >
            Atualizar meus dados
          </button>
        </Card>
      )}
    </div>
  )
}

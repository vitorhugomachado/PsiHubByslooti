import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import type { FinanceSummary, Patient, Payment, PaymentMethod, PaymentStatus } from '../types'
import { Button, EmptyState, Input, Label, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui'
import { MonthBars } from '../components/finance/MonthBars'
import {
  METHOD_LABEL,
  METHOD_ORDER,
  PAYMENT_STATUS_META,
  daysUntilDue,
  dunningWhatsApp,
  dueLabel,
  formatMoney,
  receiptText,
} from '../lib/finance'
import { formatDate, toDateTimeLocal } from '../lib/format'
import { useAuth } from '../lib/auth'

type Filter = 'ALL' | PaymentStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PENDING', label: 'Pendentes' },
  { id: 'OVERDUE', label: 'Vencidas' },
  { id: 'PAID', label: 'Pagas' },
]

const STATUS_ORDER: PaymentStatus[] = ['PENDING', 'OVERDUE', 'PAID']

interface PayForm {
  id?: string
  patientId: string
  amount: string
  dueDate: string
  status: PaymentStatus
  method: PaymentMethod | ''
  description: string
}

function buildForm(): PayForm {
  return {
    patientId: '',
    amount: '',
    dueDate: toDateTimeLocal(new Date()).slice(0, 10),
    status: 'PENDING',
    method: '',
    description: '',
  }
}

/* ---------- Icones ---------- */
function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}
const ICONS = {
  check: 'M20 6 9 17l-5-5',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
}

function IconBtn({
  title,
  onClick,
  path,
  tone = 'white',
  disabled,
}: {
  title: string
  onClick: () => void
  path: string
  tone?: 'white' | 'brand' | 'green' | 'pop' | 'sun'
  disabled?: boolean
}) {
  const tones: Record<string, string> = {
    white: 'bg-white text-ink hover:bg-ink/5',
    brand: 'bg-brand text-white hover:brightness-110',
    green: 'bg-emerald-400 text-ink hover:brightness-105',
    pop: 'bg-pop text-white hover:brightness-110',
    sun: 'bg-sun text-ink hover:brightness-105',
  }
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-ink shadow-ink transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon path={path} />
    </button>
  )
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'white',
  badge,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'white' | 'brand' | 'sun' | 'pop' | 'green'
  badge?: { text: string; up: boolean } | null
}) {
  const tones: Record<string, string> = {
    white: 'bg-white',
    brand: 'bg-brand text-white',
    sun: 'bg-sun text-ink',
    pop: 'bg-pop text-white',
    green: 'bg-emerald-300 text-ink',
  }
  const dim = tone === 'white' || tone === 'sun' || tone === 'green' ? 'opacity-65' : 'opacity-85'
  return (
    <div className={`sticker rounded-3xl p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-round text-xs font-bold uppercase tracking-wide ${dim}`}>{label}</p>
        {badge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border border-ink px-2 py-0.5 font-round text-[11px] font-bold ${
              badge.up ? 'bg-emerald-300 text-ink' : 'bg-pop text-white'
            }`}
          >
            <Icon path={badge.up ? ICONS.arrowUp : ICONS.arrowDown} size={11} />
            {badge.text}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl leading-none tracking-wide sm:text-4xl">{value}</p>
      {hint && <p className={`mt-2 font-round text-xs font-semibold ${dim}`}>{hint}</p>}
    </div>
  )
}

// Chave PIX da clinica: aparece para o paciente no portal, junto das cobrancas.
function PixCard() {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)

  const { data } = useQuery({
    queryKey: ['clinicPix'],
    queryFn: () => apiFetch<{ pixKey: string | null }>('/portal-admin/pix'),
  })

  const pixKey = data?.pixKey ?? null

  useEffect(() => {
    if (!editing) setValue(pixKey ?? '')
  }, [pixKey, editing])

  const save = useMutation({
    mutationFn: (next: string) => apiFetch<{ pixKey: string | null }>('/portal-admin/pix', { method: 'PUT', body: JSON.stringify({ pixKey: next }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinicPix'] })
      setEditing(false)
    },
  })

  return (
    <div className="sticker mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">ðŸ’ </span>
        <div>
          <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">Chave PIX do portal</p>
          <p className="font-round text-sm font-bold text-ink">
            {pixKey || <span className="font-semibold text-ink/40">nenhuma chave configurada</span>}
          </p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex.: clinica@email.com ou telefone"
              className="!w-64"
            />
            <Button variant="sun" disabled={save.isPending} onClick={() => save.mutate(value.trim())} className="!px-4 !py-1.5 !text-xs">
              Salvar
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-ink bg-white px-3 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-ink bg-white px-4 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink transition hover:bg-cream"
          >
            {pixKey ? 'Editar chave' : 'Configurar chave'}
          </button>
        )}
      </div>
    </div>
  )
}

export function Financeiro() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const clinicName = user?.clinicName || 'Psi Hub'

  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PayForm>(buildForm())
  const [receipt, setReceipt] = useState<Payment | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => apiFetch<FinanceSummary>('/payments/summary'),
  })

  const { data: payments = [], isLoading: loadingList } = useQuery({
    queryKey: ['payments', filter],
    queryFn: () => apiFetch<Payment[]>(`/payments${filter === 'ALL' ? '' : `?status=${filter}`}`),
  })

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => apiFetch<Patient[]>('/patients?status=ALL'),
  })

  const [params, setParams] = useSearchParams()

  // Vindo do perfil do paciente (/financeiro?new=1&patientId=...): abre o modal
  // ja com o paciente selecionado e o valor padrao da sessao preenchido.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current) return
    if (params.get('new') !== '1') return
    const pid = params.get('patientId')
    const patient = pid ? patients.find((x) => x.id === pid) : null
    if (pid && !patient) return // aguarda a lista de pacientes carregar
    autoOpened.current = true
    setForm({
      ...buildForm(),
      patientId: pid || '',
      amount: patient?.defaultSessionPrice != null ? String(patient.defaultSessionPrice) : '',
    })
    setError('')
    setModalOpen(true)
    const next = new URLSearchParams(params)
    next.delete('new')
    next.delete('patientId')
    setParams(next, { replace: true })
  }, [params, patients, setParams])

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['payments'] })
    qc.invalidateQueries({ queryKey: ['finance'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const saveMutation = useMutation({
    mutationFn: (data: PayForm) => {
      const payload = {
        patientId: data.patientId,
        amount: Number(data.amount),
        dueDate: new Date(`${data.dueDate}T12:00:00`).toISOString(),
        status: data.status,
        method: data.method || undefined,
        description: data.description || undefined,
      }
      return data.id
        ? apiFetch(`/payments/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : apiFetch('/payments', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}/pay`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível registrar o pagamento.'),
  })

  const unpayMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}/unpay`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
    },
  })

  // Geracao das cobrancas do mes para todos os pacientes ativos com valor padrao.
  const generateMonth = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; skipped: number; month: string; skippedPatients: string[] }>('/payments/generate-monthly', {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (r) => {
      invalidate()
      if (r.created === 0 && r.skipped === 0) {
        alert(
          'Nenhum paciente ativo com "valor padrão da sessão" definido.\n\nAbra Pacientes, edite o paciente e informe o valor para gerar as cobranças automaticamente.',
        )
        return
      }
      alert(
        `${r.created} cobrança(s) criada(s) para ${r.month}.` +
          (r.skipped > 0 ? `\n\n${r.skipped} paciente(s) pulado(s) por já terem cobrança no mês.` : ''),
      )
    },
    onError: () => setError('Não foi possível gerar as cobranças do mês.'),
  })

  async function run(id: string, fn: () => Promise<unknown>) {
    setPendingId(id)
    setError('')
    try {
      await fn()
    } finally {
      setPendingId(null)
    }
  }

  const list = useMemo(() => {
    const rank: Record<PaymentStatus, number> = { OVERDUE: 0, PENDING: 1, PAID: 2 }
    const q = search.trim().toLowerCase()
    return [...payments]
      .filter((p) => !q || (p.patient?.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
      .sort((a, b) => {
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        const da = new Date(a.dueDate).getTime()
        const db = new Date(b.dueDate).getTime()
        return a.status === 'PAID' ? db - da : da - db
      })
  }, [payments, search])

  const listTotal = list.reduce((s, p) => s + p.amount, 0)

  function openNew() {
    setForm(buildForm())
    setError('')
    setModalOpen(true)
  }

  function openEdit(p: Payment) {
    setForm({
      id: p.id,
      patientId: p.patientId,
      amount: String(p.amount),
      dueDate: toDateTimeLocal(new Date(p.dueDate)).slice(0, 10),
      status: p.status,
      method: p.method || '',
      description: p.description || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ambiente sem clipboard */
    }
  }

  function printReceipt(p: Payment) {
    const text = receiptText(p, clinicName)
    const w = window.open('', '_blank', 'width=440,height=620')
    if (!w) return
    const safe = text.replace(/[<>&]/g, (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'))
    w.document.write(
      `<!doctype html><html><head><title>Recibo</title></head><body style="margin:0;padding:32px;font:14px/1.7 ui-monospace,monospace;color:#0b0b12"><pre style="white-space:pre-wrap;font:inherit;margin:0">${safe}</pre><script>window.onload=function(){window.print()}</script></body></html>`,
    )
    w.document.close()
  }

  if (loadingSummary) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Cobranças, recebimentos e relatórios"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => generateMonth.mutate()} disabled={generateMonth.isPending}>
              {generateMonth.isPending ? 'Gerando...' : 'Gerar cobranças do mês'}
            </Button>
            <Button onClick={openNew}>+ Nova cobrança</Button>
          </div>
        }
      />

      {error && <div className="mb-4 rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Recebido no mês"
          value={formatMoney(summary?.receivedMonth ?? 0)}
          tone="brand"
          hint={`${summary?.paidCountMonth ?? 0} pagamento(s) confirmado(s)`}
          badge={
            summary?.trend != null
              ? { text: `${Math.abs(Math.round(summary.trend))}%`, up: summary.trend >= 0 }
              : null
          }
        />
        <KpiCard
          label="A receber"
          value={formatMoney(summary?.pendingAmount ?? 0)}
          hint={`${summary?.pendingCount ?? 0} cobrança(s) pendente(s)`}
        />
        <KpiCard
          label="Em atraso"
          value={formatMoney(summary?.overdueAmount ?? 0)}
          tone={(summary?.overdueCount ?? 0) > 0 ? 'pop' : 'white'}
          hint={`${summary?.overdueCount ?? 0} cobrança(s) vencida(s)`}
        />
        <KpiCard
          label="Ticket medio"
          value={formatMoney(summary?.ticketMedio ?? 0)}
          tone="sun"
          hint={`previsão total: ${formatMoney(summary?.forecast ?? 0)}`}
        />
      </div>

      <PixCard />

      {/* Grafico + proximos vencimentos */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="sticker rounded-3xl bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-ink">Recebimentos</h2>
              <p className="font-round text-xs font-semibold text-ink/50">últimos 6 meses</p>
            </div>
            {summary?.byMethod && summary.byMethod.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {summary.byMethod.map((m) => (
                  <span key={m.method} className="rounded-full border border-ink bg-cream px-2.5 py-0.5 font-round text-[11px] font-bold">
                    {METHOD_LABEL[m.method as PaymentMethod] || m.method}: {formatMoney(m.total)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <MonthBars data={summary?.series ?? []} />
        </div>

        <div className="sticker flex flex-col rounded-3xl bg-white">
          <div className="border-b border-ink px-5 py-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-ink">Próximos vencimentos</h2>
          </div>
          <div className="flex-1 divide-y divide-ink/10">
            {(summary?.upcoming ?? []).length === 0 && (
              <p className="px-5 py-6 text-center font-round text-sm font-semibold text-ink/50">Nada a vencer. Tudo em ordem! ðŸŽ‰</p>
            )}
            {(summary?.upcoming ?? []).map((p) => {
              const late = daysUntilDue(p) < 0
              return (
                <button
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-cream"
                >
                  <div className="min-w-0">
                    <p className="truncate font-round text-sm font-bold text-ink">{p.patient?.name || 'Paciente'}</p>
                    <p className={`font-round text-[11px] font-bold ${late ? 'text-pop' : 'text-ink/50'}`}>
                      {formatDate(p.dueDate)} Â· {dueLabel(p)}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-base tracking-wide text-ink">{formatMoney(p.amount)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-ink bg-white p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 font-round text-xs font-bold uppercase tracking-wide transition ${
                  filter === f.id ? 'bg-brand text-white' : 'text-ink/60 hover:bg-ink/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente ou descrição..."
            className="min-w-[200px] flex-1 rounded-full border border-ink bg-white px-4 py-1.5 font-round text-sm font-semibold placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-brand/35"
          />
          <span className="font-round text-sm font-bold text-ink/60">
            {list.length} item(ns) Â· {formatMoney(listTotal)}
          </span>
        </div>

        {loadingList ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState title="Nenhuma cobrança" description="Cadastre a primeira cobrança para começar a acompanhar o seu faturamento." />
        ) : (
          <div className="sticker divide-y divide-ink/10 overflow-hidden rounded-3xl bg-white">
            {list.map((p) => {
              const meta = PAYMENT_STATUS_META[p.status]
              const busy = pendingId === p.id
              const wa = dunningWhatsApp(p, clinicName)
              const late = p.status !== 'PAID' && daysUntilDue(p) < 0
              return (
                <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 transition ${p.status === 'PAID' ? 'bg-white/60' : ''}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-round font-bold ${p.status === 'PAID' ? 'text-ink/60' : 'text-ink'}`}>
                      {p.patient?.name || 'Paciente'}
                    </p>
                    <p className="truncate font-round text-[11px] font-bold text-ink/45">
                      {p.description || 'Atendimento psicológico'} Â· venc. {formatDate(p.dueDate)} Â·{' '}
                      <span className={late ? 'text-pop' : ''}>{dueLabel(p)}</span>
                      {p.method ? ` Â· ${METHOD_LABEL[p.method]}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 font-display text-lg tracking-wide ${p.status === 'PAID' ? 'text-ink/60' : 'text-ink'}`}>
                    {formatMoney(p.amount)}
                  </span>
                  <span className={`shrink-0 rounded-full border border-ink px-2.5 py-0.5 font-round text-[11px] font-bold ${meta.chip}`}>
                    {meta.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.status === 'PAID' ? (
                      <>
                        <IconBtn title="Recibo" path={ICONS.doc} onClick={() => setReceipt(p)} />
                        <IconBtn title="Desfazer baixa" path={ICONS.undo} tone="sun" disabled={busy} onClick={() => run(p.id, () => unpayMutation.mutateAsync(p.id))} />
                      </>
                    ) : (
                      <>
                        <IconBtn title="Registrar pagamento" path={ICONS.check} tone="green" disabled={busy} onClick={() => run(p.id, () => payMutation.mutateAsync(p.id))} />
                        {wa && (
                          <a
                            title="Cobrar no WhatsApp"
                            aria-label="Cobrar no WhatsApp"
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink bg-white text-ink shadow-ink transition hover:bg-emerald-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                          >
                            <Icon path={ICONS.chat} />
                          </a>
                        )}
                      </>
                    )}
                    <IconBtn title="Editar" path={ICONS.edit} onClick={() => openEdit(p)} />
                    <IconBtn
                      title="Excluir"
                      path={ICONS.trash}
                      tone="pop"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Excluir a cobrança de ${p.patient?.name}?`)) deleteMutation.mutate(p.id)
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de cobranca */}
      <Modal open={modalOpen} title={form.id ? 'Editar cobrança' : 'Nova cobrança'} onClose={() => setModalOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.patientId) return setError('Selecione um paciente')
            if (!form.amount || Number(form.amount) <= 0) return setError('Informe um valor valido')
            saveMutation.mutate(form)
          }}
        >
          {error && <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}
          <div>
            <Label>Paciente *</Label>
            <Select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Selecione...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="150,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod | '' })}>
                <option value="">Não informada</option>
                {METHOD_ORDER.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Sessão de psicoterapia - Outubro"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-between gap-2 pt-2">
            {form.id ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (confirm('Excluir esta cobrança?')) deleteMutation.mutate(form.id!)
                }}
              >
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal de recibo */}
      <Modal open={!!receipt} title="Recibo" onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink bg-cream p-5">
              <p className="font-display text-lg uppercase tracking-wide text-ink">Recibo de pagamento</p>
              <dl className="mt-3 space-y-1.5 font-round text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-ink/60">Paciente</dt>
                  <dd className="text-right font-bold text-ink">{receipt.patient?.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-ink/60">Valor</dt>
                  <dd className="font-display text-lg text-ink">{formatMoney(receipt.amount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-ink/60">Referente a</dt>
                  <dd className="text-right font-bold text-ink">{receipt.description || 'Atendimento psicológico'}</dd>
                </div>
                {receipt.method && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-bold text-ink/60">Forma</dt>
                    <dd className="font-bold text-ink">{METHOD_LABEL[receipt.method]}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-ink/60">Data</dt>
                  <dd className="font-bold text-ink">{formatDate(receipt.paidAt || receipt.dueDate)}</dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-dashed border-ink/20 pt-3 font-round text-xs font-semibold text-ink/60">
                {clinicName} Â· documento gerado pelo Psi Hub
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {copied && <span className="self-center font-round text-xs font-bold text-emerald-600">copiado!</span>}
              <Button variant="secondary" onClick={() => copyText(receiptText(receipt, clinicName))}>
                Copiar texto
              </Button>
              <Button onClick={() => printReceipt(receipt)}>Imprimir</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

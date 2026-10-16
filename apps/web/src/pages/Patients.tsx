import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiFetch } from '../lib/api'
import type { Patient, PatientFilter, PatientListItem, PatientOrder, PatientStatsResponse, PatientStatus } from '../types'
import { Button, EmptyState, Input, Label, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui'
import { PatientDrawer } from '../components/patients/PatientDrawer'
import {
  REFERRAL_OPTIONS,
  age,
  avatarColor,
  birthdayIn,
  downloadCsv,
  initials,
  patientsToCsv,
  shortDay,
} from '../lib/patients'
import { formatDate, formatTime } from '../lib/format'
import { formatMoney } from '../lib/finance'
import { whatsappLink } from '../lib/session'

const FILTERS: { id: PatientFilter; label: string }[] = [
  { id: 'ACTIVE', label: 'Ativos' },
  { id: 'ALL', label: 'Todos' },
  { id: 'INACTIVE', label: 'Inativos' },
  { id: 'TRASH', label: 'Lixeira' },
]

const ORDERS: { id: PatientOrder; label: string }[] = [
  { id: 'name', label: 'Nome (A-Z)' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'next', label: 'Próxima sessão' },
  { id: 'open', label: 'Maior valor em aberto' },
]

interface FormState {
  id?: string
  name: string
  email: string
  phone: string
  birthDate: string
  document: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  referralSource: string
  defaultSessionPrice: string
  consentAt: string | null
  status: PatientStatus
  notes: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  document: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  referralSource: '',
  defaultSessionPrice: '',
  consentAt: null,
  status: 'ACTIVE',
  notes: '',
}

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function Icon({ path, size = 15 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  cake: 'M12 2v3M5 12h14M4 21h16a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zM7 12V9a5 5 0 0 1 10 0v3',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 12h.01',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  plus: 'M12 5v14M5 12h14',
  restore: 'M3 7v6h6M3 13a9 9 0 1 0 3-7',
}

function IconBtn({ title, path, onClick, tone = 'white', disabled }: { title: string; path: string; onClick: () => void; tone?: 'white' | 'pop' | 'sun'; disabled?: boolean }) {
  const tones = { white: 'bg-white text-ink hover:bg-ink/5', pop: 'bg-pop text-white hover:brightness-110', sun: 'bg-sun text-ink hover:brightness-105' }
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

function StatCard({ label, value, hint, icon, tone = 'white', onClick }: { label: string; value: string; hint?: string; icon: string; tone?: 'white' | 'brand' | 'sun' | 'pop'; onClick?: () => void }) {
  const tones = { white: 'bg-white', brand: 'bg-brand text-white', sun: 'bg-sun text-ink', pop: 'bg-pop text-white' }
  const dim = tone === 'white' ? 'text-ink/50' : 'opacity-80'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`sticker rounded-3xl p-4 text-left ${tones[tone]} ${onClick ? 'transition hover:-translate-y-0.5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-round text-[11px] font-bold uppercase tracking-wide ${dim}`}>{label}</p>
        <span className={dim}>
          <Icon path={icon} size={16} />
        </span>
      </div>
      <p className="mt-1.5 font-display text-3xl leading-none tracking-wide">{value}</p>
      {hint && <p className={`mt-1.5 font-round text-[11px] font-semibold ${dim}`}>{hint}</p>}
    </Tag>
  )
}

export function Patients() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput)
  const [filter, setFilter] = useState<PatientFilter>('ACTIVE')
  const [order, setOrder] = useState<PatientOrder>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [birthdayOpen, setBirthdayOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['patientStats'],
    queryFn: () => apiFetch<PatientStatsResponse>('/patients/stats'),
  })

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', filter, order, search],
    queryFn: () =>
      apiFetch<PatientListItem[]>(
        `/patients?status=${filter}&order=${order}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
      ),
  })

  // Limpa a selecao quando a lista muda de contexto.
  useEffect(() => {
    setSelected(new Set())
  }, [filter, order, search])

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['patients'] })
    qc.invalidateQueries({ queryKey: ['patientStats'] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ data, allowDuplicate }: { data: FormState; allowDuplicate?: boolean }) => {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate || null,
        document: data.document,
        address: data.address,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        referralSource: data.referralSource,
        defaultSessionPrice: data.defaultSessionPrice === '' ? null : Number(data.defaultSessionPrice),
        consentAt: data.consentAt,
        status: data.status,
        notes: data.notes,
        ...(allowDuplicate ? { allowDuplicate: true } : {}),
      }
      return data.id
        ? apiFetch(`/patients/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : apiFetch('/patients', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      setDrawerId(null)
    },
    onError: (err, variables) => {
      // 409: ja existe paciente com o mesmo contato -> pede confirmacao.
      if (err instanceof ApiError && err.status === 409) {
        const dup = (err.payload as { duplicates?: { name: string }[] })?.duplicates ?? []
        const names = dup.map((d) => `â€¢ ${d.name}`).join('\n')
        if (confirm(`Já existe paciente com este e-mail ou telefone:\n\n${names}\n\nCadastrar mesmo assim?`)) {
          saveMutation.mutate({ ...variables, allowDuplicate: true })
        }
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/patients/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      setDrawerId(null)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/patients/${id}/restore`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })

  const bulkStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: PatientStatus }) =>
      Promise.all(ids.map((id) => apiFetch(`/patients/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }))),
    onSuccess: () => {
      setSelected(new Set())
      invalidate()
    },
  })

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => apiFetch(`/patients/${id}`, { method: 'DELETE' }))),
    onSuccess: () => {
      setSelected(new Set())
      invalidate()
    },
  })

  const selectedIds = useMemo(() => [...selected], [selected])
  const allSelected = patients.length > 0 && selected.size === patients.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(patients.map((p) => p.id)))
  }

  function openNew() {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(patient: Patient | PatientListItem) {
    setForm({
      id: patient.id,
      name: patient.name,
      email: patient.email || '',
      phone: patient.phone || '',
      birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
      document: patient.document || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      emergencyPhone: patient.emergencyPhone || '',
      referralSource: patient.referralSource || '',
      defaultSessionPrice: patient.defaultSessionPrice != null ? String(patient.defaultSessionPrice) : '',
      consentAt: patient.consentAt || null,
      status: patient.status,
      notes: patient.notes || '',
    })
    setError('')
    setModalOpen(true)
  }

  function removePatient(patient: { id: string; name: string }) {
    if (
      confirm(
        `Mover ${patient.name} para a lixeira?\n\nO histórico de sessões e cobranças e mantido, e o paciente fica inativo. Da para restaurar depois.`,
      )
    ) {
      deleteMutation.mutate(patient.id)
    }
  }

  const isTrash = filter === 'TRASH'

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro, histórico e financeiro de cada paciente"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => downloadCsv(`pacientes-${new Date().toISOString().slice(0, 10)}.csv`, patientsToCsv(patients))}
              disabled={patients.length === 0}
            >
              <Icon path={ICONS.download} /> Exportar CSV
            </Button>
            <Button onClick={openNew}>
              <Icon path={ICONS.plus} /> Novo paciente
            </Button>
          </div>
        }
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes" value={String(stats?.total ?? 0)} hint={`${stats?.active ?? 0} ativo(s)`} icon={ICONS.users} tone="brand" onClick={() => setFilter('ALL')} />
        <StatCard label="Ativos" value={String(stats?.active ?? 0)} hint={`${stats?.inactive ?? 0} inativo(s)`} icon={ICONS.calendar} onClick={() => setFilter('ACTIVE')} />
        <StatCard label="Novos no mês" value={String(stats?.newThisMonth ?? 0)} hint="cadastrados neste mês" icon={ICONS.plus} tone="sun" />
        <StatCard
          label="Aniversariantes"
          value={String(stats?.birthdays.length ?? 0)}
          hint={stats?.birthdays.length ? `${stats.birthdays[0].name.split(' ')[0]} dia ${stats.birthdays[0].day}` : 'nenhum neste mês'}
          icon={ICONS.cake}
          tone={stats?.birthdays.length ? 'pop' : 'white'}
          onClick={() => setBirthdayOpen(true)}
        />
      </div>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-full border border-ink bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 font-round text-xs font-bold uppercase tracking-wide transition ${
                filter === f.id ? 'bg-brand text-white' : 'text-ink/60 hover:bg-ink/5'
              }`}
            >
              {f.label}
              {f.id === 'TRASH' && (stats?.trash ?? 0) > 0 && <span className="ml-1">({stats?.trash})</span>}
            </button>
          ))}
        </div>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome, e-mail, telefone ou CPF..."
          className="min-w-[200px] flex-1 rounded-full border border-ink bg-white px-4 py-1.5 font-round text-sm font-semibold placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-brand/35"
        />

        <Select value={order} onChange={(e) => setOrder(e.target.value as PatientOrder)} className="w-auto rounded-full py-1.5 text-sm">
          {ORDERS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Barra de acoes em lote */}
      {selected.size > 0 && (
        <div className="sticker mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sun px-4 py-2">
          <span className="font-round text-sm font-bold text-ink">{selected.size} selecionado(s)</span>
          <div className="flex flex-wrap items-center gap-2">
            {isTrash ? (
              <Button
                variant="secondary"
                className="px-4 py-1.5 text-xs"
                disabled={restoreMutation.isPending}
                onClick={() => {
                  Promise.all(selectedIds.map((id) => restoreMutation.mutateAsync(id))).then(() => setSelected(new Set()))
                }}
              >
                Restaurar selecionados
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="px-4 py-1.5 text-xs" disabled={bulkStatus.isPending} onClick={() => bulkStatus.mutate({ ids: selectedIds, status: 'INACTIVE' })}>
                  Inativar
                </Button>
                <Button variant="secondary" className="px-4 py-1.5 text-xs" disabled={bulkStatus.isPending} onClick={() => bulkStatus.mutate({ ids: selectedIds, status: 'ACTIVE' })}>
                  Ativar
                </Button>
                <Button
                  variant="danger"
                  className="px-4 py-1.5 text-xs"
                  disabled={bulkDelete.isPending}
                  onClick={() => {
                    if (confirm(`Mover ${selected.size} paciente(s) para a lixeira?`)) bulkDelete.mutate(selectedIds)
                  }}
                >
                  Excluir
                </Button>
              </>
            )}
            <button onClick={() => setSelected(new Set())} className="font-round text-xs font-bold uppercase tracking-wide text-ink/60 underline decoration-dotted">
              limpar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="mt-4">
        {isLoading ? (
          <Spinner />
        ) : patients.length === 0 ? (
          <EmptyState
            title={isTrash ? 'Lixeira vazia' : search ? 'Nenhum paciente encontrado' : 'Nenhum paciente ainda'}
            description={
              isTrash
                ? 'Pacientes excluidos ficam aqui e podem ser restaurados.'
                : search
                  ? 'Tente outro termo de busca ou mude o filtro.'
                  : 'Cadastre o primeiro paciente para começar.'
            }
          />
        ) : (
          <div className="sticker divide-y divide-ink/10 overflow-hidden rounded-3xl bg-white">
            <div className="flex items-center gap-3 bg-cream/60 px-4 py-2">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand" aria-label="Selecionar todos" />
              <span className="font-round text-[11px] font-bold uppercase tracking-wide text-ink/50">
                {patients.length} paciente(s)
              </span>
            </div>

            {patients.map((p) => {
              const bday = birthdayIn(p.birthDate)
              const wa = whatsappLink(p.phone, `Oi, ${p.name.split(' ')[0]}! Tudo bem?`)
              const next = p.nextAppointment
              return (
                <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-cream/40 ${selected.has(p.id) ? 'bg-brand-light/40' : ''}`}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-brand" aria-label={`Selecionar ${p.name}`} />

                  <button type="button" onClick={() => setDrawerId(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink font-round text-sm font-bold shadow-ink ${avatarColor(p.id)}`}>
                      {initials(p.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-round font-bold text-ink">{p.name}</span>
                        {p.status === 'INACTIVE' && !p.deletedAt && (
                          <span className="rounded-full border border-ink bg-slate-200 px-2 py-0.5 font-round text-[10px] font-bold">Inativo</span>
                        )}
                        {p.deletedAt && <span className="rounded-full border border-ink bg-pop px-2 py-0.5 font-round text-[10px] font-bold text-white">Na lixeira</span>}
                        {bday && bday.daysUntil === 0 && (
                          <span className="rounded-full border border-ink bg-sun px-2 py-0.5 font-round text-[10px] font-bold">aniversario hoje</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate font-round text-[11px] font-semibold text-ink/50">
                        {age(p.birthDate) != null ? `${age(p.birthDate)} anos Â· ` : ''}
                        {p.phone || 'sem telefone'}
                        {p.email ? ` Â· ${p.email}` : ''} Â· {p.sessionCount} sessão(oes)
                      </span>
                    </span>
                  </button>

                  <div className="hidden w-44 shrink-0 text-right md:block">
                    {next ? (
                      <>
                        <p className="font-round text-xs font-bold text-ink">
                          {shortDay(next.startAt)} as {formatTime(next.startAt)}
                        </p>
                        <p className="font-round text-[10px] font-semibold text-ink/45">próxima sessão</p>
                      </>
                    ) : p.lastSessionAt ? (
                      <>
                        <p className="font-round text-xs font-bold text-ink/70">{formatDate(p.lastSessionAt)}</p>
                        <p className="font-round text-[10px] font-semibold text-ink/45">última sessão</p>
                      </>
                    ) : (
                      <p className="font-round text-[10px] font-semibold text-ink/35">sem sessões</p>
                    )}
                  </div>

                  {p.openAmount > 0 && (
                    <span
                      className="shrink-0 rounded-full border border-ink bg-sun px-2.5 py-0.5 font-round text-[11px] font-bold"
                      title={`${p.openCount} cobrança(s) em aberto`}
                    >
                      {formatMoney(p.openAmount)}
                    </span>
                  )}

                  <div className="flex shrink-0 items-center gap-1.5">
                    {wa && (
                      <a
                        title="WhatsApp"
                        aria-label="WhatsApp"
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink bg-white text-ink shadow-ink transition hover:bg-emerald-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                      >
                        <Icon path={ICONS.chat} />
                      </a>
                    )}
                    {p.deletedAt ? (
                      <IconBtn title="Restaurar" path={ICONS.restore} tone="sun" onClick={() => restoreMutation.mutate(p.id)} />
                    ) : (
                      <>
                        <IconBtn title="Editar" path={ICONS.edit} onClick={() => openEdit(p)} />
                        <IconBtn title="Mover para a lixeira" path={ICONS.trash} tone="pop" onClick={() => removePatient(p)} />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de cadastro */}
      <Modal open={modalOpen} title={form.id ? 'Editar paciente' : 'Novo paciente'} onClose={() => setModalOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (form.name.trim().length < 2) return setError('Informe o nome completo')
            saveMutation.mutate({ data: form })
          }}
        >
          {error && <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}

          <div>
            <Label>Nome completo *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Carlos Souza" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="paciente@email.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-0000" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="000.000.000-00" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Valor padrão da sessão (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.defaultSessionPrice}
                onChange={(e) => setForm({ ...form, defaultSessionPrice: e.target.value })}
                placeholder="180,00"
              />
            </div>
            <div>
              <Label>Como conheceu a clínica</Label>
              <Select value={form.referralSource} onChange={(e) => setForm({ ...form, referralSource: e.target.value })}>
                <option value="">Não informado</option>
                {REFERRAL_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Contato de emergência</Label>
              <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Nome e parentesco" />
            </div>
            <div>
              <Label>Telefone de emergência</Label>
              <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="(11) 99999-0000" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-[160px]">
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PatientStatus })}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 pt-5 font-round text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={!!form.consentAt}
                onChange={(e) => setForm({ ...form, consentAt: e.target.checked ? form.consentAt || new Date().toISOString() : null })}
                className="h-4 w-4 accent-brand"
              />
              Consentimento LGPD registrado
            </label>
          </div>

          <div>
            <Label>Anotações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações internas sobre o acompanhamento" />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {form.id ? (
              <Button type="button" variant="danger" onClick={() => form.id && removePatient({ id: form.id, name: form.name })}>
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

      {/* Modal de aniversariantes */}
      <Modal open={birthdayOpen} title="Aniversariantes do mês" onClose={() => setBirthdayOpen(false)}>
        {(stats?.birthdays.length ?? 0) === 0 ? (
          <p className="py-4 text-center font-round text-sm font-semibold text-ink/60">Nenhum aniversariante neste mês.</p>
        ) : (
          <div className="divide-y divide-ink/10">
            {stats?.birthdays.map((b) => {
              const wa = whatsappLink(b.phone, `Oi, ${b.name.split(' ')[0]}! Feliz aniversario! ðŸŽ‰`)
              return (
                <div key={b.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink font-round text-xs font-bold shadow-ink ${avatarColor(b.id)}`}>
                    {initials(b.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-round text-sm font-bold text-ink">{b.name}</p>
                    <p className="font-round text-[11px] font-semibold text-ink/50">
                      dia {b.day} Â· {formatDate(b.birthDate)}
                    </p>
                  </div>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-ink bg-emerald-300 px-2.5 py-1 font-round text-[11px] font-bold text-ink"
                    >
                      Parabéns
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Perfil do paciente */}
      <PatientDrawer
        patientId={drawerId}
        onClose={() => setDrawerId(null)}
        onEdit={(p) => openEdit(p)}
        onSchedule={(p) => navigate(`/agenda?patientId=${p.id}&new=1`)}
        onNewPayment={(p) => navigate(`/financeiro?patientId=${p.id}&new=1`)}
        onChanged={invalidate}
      />
    </div>
  )
}

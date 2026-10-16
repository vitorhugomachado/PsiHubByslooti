import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import type { Appointment, AppointmentStatus, Modality, Patient } from '../types'
import { Button, Input, Label, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui'
import { DayWeekGrid } from '../components/agenda/DayWeekGrid'
import { MonthGrid } from '../components/agenda/MonthGrid'
import { YearGrid } from '../components/agenda/YearGrid'
import { PatientPanel } from '../components/agenda/PatientPanel'
import { TrashZone } from '../components/agenda/TrashZone'
import { STATUS_META, STATUS_ORDER, durationMinutes, type DragPayload } from '../lib/appointments'
import { formatCurrency, formatTime, toDateTimeLocal } from '../lib/format'
import {
  addDays,
  addMonths,
  capitalize,
  formatDayLong,
  formatMonthYear,
  formatShortDay,
  minutesOfDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  withTimeOnDate,
} from '../lib/date'

type View = 'day' | 'week' | 'month' | 'year'

const VIEW_LABELS: { id: View; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'year', label: 'Ano' },
]

interface FormState {
  id?: string
  patientId: string
  date: string
  time: string
  duration: number
  modality: Modality
  status: AppointmentStatus
  notes: string
}

function buildForm(opts?: { patientId?: string; start?: Date }): FormState {
  const start = opts?.start ? new Date(opts.start) : new Date()
  if (!opts?.start) {
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
  }
  const local = toDateTimeLocal(start)
  return {
    patientId: opts?.patientId ?? '',
    date: local.slice(0, 10),
    time: local.slice(11, 16),
    duration: 50,
    modality: 'IN_PERSON',
    status: 'SCHEDULED',
    notes: '',
  }
}

export function Agenda() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const initialDate = useMemo(() => {
    const d = params.get('date')
    if (d) {
      const parsed = new Date(`${d}T00:00:00`)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    return null
  }, [params])
  const [view, setView] = useState<View>(initialDate ? 'day' : 'week')
  const [cursor, setCursor] = useState(() => initialDate ?? new Date())
  const [drag, setDrag] = useState<DragPayload>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(buildForm())
  const [error, setError] = useState('')
  // "Neste dia tem que me pagar": cobrança vinculada à sessão.
  const [cobranca, setCobranca] = useState<{ appt: Appointment; valor: string; erro: string } | null>(null)

  // Abre o modal de nova sessao quando a navegacao vem do perfil do paciente
  // (/agenda?new=1&patientId=...).
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current) return
    if (params.get('new') !== '1') return
    autoOpened.current = true
    openNew({ patientId: params.get('patientId') || undefined })
    const next = new URLSearchParams(params)
    next.delete('new')
    next.delete('patientId')
    setParams(next, { replace: true })
  }, [params, setParams])

  // Intervalo visivel -> parametros da consulta.
  const range = useMemo(() => {
    if (view === 'day') {
      const from = startOfDay(cursor)
      return { from, to: addDays(from, 1) }
    }
    if (view === 'week') {
      const from = startOfWeek(cursor)
      return { from, to: addDays(from, 7) }
    }
    if (view === 'month') {
      const from = startOfWeek(startOfMonth(cursor))
      return { from, to: addDays(from, 42) }
    }
    const from = startOfYear(cursor)
    return { from, to: new Date(cursor.getFullYear() + 1, 0, 1) }
  }, [view, cursor])

  const days = useMemo(() => {
    if (view === 'day') return [startOfDay(cursor)]
    const s = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }, [view, cursor])

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', range.from.toISOString(), range.to.toISOString()],
    queryFn: () => apiFetch<Appointment[]>(`/appointments?from=${range.from.toISOString()}&to=${range.to.toISOString()}`),
  })

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => apiFetch<Patient[]>('/patients?status=ALL'),
  })

  // Mover agendamento (arrastar-e-soltar) com atualizacao otimista.
  const reschedule = useMutation({
    mutationFn: (v: { id: string; startAt: string; endAt: string }) =>
      apiFetch(`/appointments/${v.id}`, { method: 'PUT', body: JSON.stringify({ startAt: v.startAt, endAt: v.endAt }) }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['appointments'] })
      const prev = qc.getQueriesData<Appointment[]>({ queryKey: ['appointments'] })
      qc.setQueriesData<Appointment[]>({ queryKey: ['appointments'] }, (old) =>
        old?.map((a) => (a.id === v.id ? { ...a, startAt: v.startAt, endAt: v.endAt } : a)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
      setError('Não foi possível mover o agendamento.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // Criar agendamento ao soltar um paciente na agenda.
  const createFromDrop = useMutation({
    mutationFn: (v: { patientId: string; startAt: string; endAt: string }) =>
      apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...v, modality: 'IN_PERSON', status: 'SCHEDULED' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => setError('Não foi possível criar o agendamento.'),
  })

  // Salvar pelo modal (criar ou editar).
  const saveMutation = useMutation({
    mutationFn: (data: FormState) => {
      const start = new Date(`${data.date}T${data.time}`)
      const end = new Date(start.getTime() + data.duration * 60_000)
      const payload = {
        patientId: data.patientId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        modality: data.modality,
        status: data.status,
        notes: data.notes,
      }
      return data.id
        ? apiFetch(`/appointments/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : apiFetch('/appointments', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModalOpen(false)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao salvar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModalOpen(false)
    },
  })

  // Cancela a sessão (lixeira da agenda / botão do modal) com atualização otimista.
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CANCELED' }) }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['appointments'] })
      const prev = qc.getQueriesData<Appointment[]>({ queryKey: ['appointments'] })
      qc.setQueriesData<Appointment[]>({ queryKey: ['appointments'] }, (old) =>
        old?.map((a) => (a.id === id ? { ...a, status: 'CANCELED' as AppointmentStatus } : a)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
      setError('Não foi possível cancelar a sessão.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // Cria a cobrança do dia da sessão (aparece "a receber" no Financeiro).
  const cobrarMutation = useMutation({
    mutationFn: (v: { appt: Appointment; valor: number }) => {
      const due = new Date(v.appt.startAt)
      due.setHours(12, 0, 0, 0)
      return apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: v.appt.patientId,
          appointmentId: v.appt.id,
          amount: v.valor,
          dueDate: due.toISOString(),
          status: 'PENDING',
          description: 'Sessão de psicoterapia',
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['finance'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setCobranca(null)
    },
    onError: (e) =>
      setCobranca((c) => (c ? { ...c, erro: e instanceof Error ? e.message : 'Erro ao criar a cobrança' } : c)),
  })

  function move(dir: number) {
    setCursor((c) => {
      if (view === 'day') return addDays(c, dir)
      if (view === 'week') return addDays(c, dir * 7)
      if (view === 'month') return addMonths(c, dir)
      return new Date(c.getFullYear() + dir, c.getMonth(), 1)
    })
  }

  const label = useMemo(() => {
    if (view === 'day') return capitalize(formatDayLong(cursor))
    if (view === 'week') {
      const s = startOfWeek(cursor)
      return `${formatShortDay(s)} – ${formatShortDay(addDays(s, 6))} · ${addDays(s, 6).getFullYear()}`
    }
    if (view === 'month') return formatMonthYear(cursor)
    return String(cursor.getFullYear())
  }, [view, cursor])

  function openNew(opts?: { patientId?: string; start?: Date }) {
    setForm(buildForm(opts))
    setError('')
    setModalOpen(true)
  }

  function openEdit(a: Appointment) {
    const start = new Date(a.startAt)
    const end = new Date(a.endAt)
    setForm({
      id: a.id,
      patientId: a.patientId,
      date: toDateTimeLocal(start).slice(0, 10),
      time: toDateTimeLocal(start).slice(11, 16),
      duration: Math.round((end.getTime() - start.getTime()) / 60_000),
      modality: a.modality,
      status: a.status,
      notes: a.notes || '',
    })
    setError('')
    setModalOpen(true)
  }

  // Solta um card na agenda.
  function handleDrop(day: Date, minutes: number | null) {
    const payload = drag
    setDrag(null)
    if (!payload) return
    setError('')

    if (payload.type === 'appt') {
      const appt = appointments.find((a) => a.id === payload.id)
      if (!appt) return
      const dur = durationMinutes(appt)
      const startMin = minutes ?? minutesOfDay(new Date(appt.startAt))
      const start = withTimeOnDate(day, startMin)
      const end = new Date(start.getTime() + dur * 60_000)
      reschedule.mutate({ id: appt.id, startAt: start.toISOString(), endAt: end.toISOString() })
    } else {
      const start = withTimeOnDate(day, minutes ?? 9 * 60)
      const end = new Date(start.getTime() + 50 * 60_000)
      createFromDrop.mutate({ patientId: payload.id, startAt: start.toISOString(), endAt: end.toISOString() })
    }
  }

  // Abre o "cobrar neste dia" (sai do modal de edição, se estiver aberto).
  function abrirCobranca(a: Appointment) {
    setModalOpen(false)
    setError('')
    setCobranca({
      appt: a,
      valor: a.patient?.defaultSessionPrice != null ? String(a.patient.defaultSessionPrice) : '',
      erro: '',
    })
  }

  // Card solto na lixeira: um clone do card "voa" até ela e a sessão é cancelada.
  function cancelarNaLixeira(id: string) {
    const card = document.querySelector<HTMLElement>(`[data-appt-id="${id}"]`)
    const lixeira = document.getElementById('lixeira-agenda')

    if (card && lixeira) {
      const doCard = card.getBoundingClientRect()
      const daLixeira = lixeira.getBoundingClientRect()

      // O clone segue o voo até a lixeira; o card original fica escondido.
      const clone = card.cloneNode(true) as HTMLElement
      clone.removeAttribute('data-appt-id')
      clone.style.position = 'fixed'
      clone.style.left = `${doCard.left}px`
      clone.style.top = `${doCard.top}px`
      clone.style.width = `${doCard.width}px`
      clone.style.height = `${doCard.height}px`
      clone.style.margin = '0'
      clone.style.setProperty('--suck-x', `${daLixeira.left + daLixeira.width / 2 - (doCard.left + doCard.width / 2)}px`)
      clone.style.setProperty('--suck-y', `${daLixeira.top + daLixeira.height / 2 - (doCard.top + doCard.height / 2)}px`)
      document.body.appendChild(clone)
      card.style.visibility = 'hidden'
      requestAnimationFrame(() => clone.classList.add('bin-suck'))

      window.setTimeout(() => {
        clone.remove()
        card.style.visibility = ''
        cancelMutation.mutate(id)
      }, 430)
      return
    }

    cancelMutation.mutate(id)
  }

  // Sessão que está sendo editada (para mostrar a cobrança dela).
  const sessaoEditada = form.id ? (appointments.find((a) => a.id === form.id) ?? null) : null

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Arraste os cards para realocar · clique para editar"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-ink bg-white p-1">
              {VIEW_LABELS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`rounded-full px-3 py-1 font-round text-xs font-bold uppercase tracking-wide transition ${
                    view === v.id ? 'bg-brand text-white' : 'text-ink/60 hover:bg-ink/5'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Button onClick={() => openNew()}>+ Nova sessão</Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>
      )}

      {/* Barra de navegacao */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => move(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink bg-white font-display text-lg shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          ‹
        </button>
        <button
          onClick={() => setCursor(new Date())}
          className="rounded-xl border border-ink bg-sun px-3 py-1.5 font-round text-sm font-bold uppercase tracking-wide shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Hoje
        </button>
        <button
          onClick={() => move(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink bg-white font-display text-lg shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          ›
        </button>
        <h2 className="ml-2 font-display text-xl uppercase tracking-wide text-ink">{label}</h2>
      </div>

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Spinner />
          ) : view === 'day' || view === 'week' ? (
            <DayWeekGrid
              days={days}
              appointments={appointments}
              drag={drag}
              onDragStart={setDrag}
              onDragEnd={() => setDrag(null)}
              onDropSlot={handleDrop}
              onSelect={openEdit}
              onCharge={abrirCobranca}
            />
          ) : view === 'month' ? (
            <MonthGrid
              monthDate={cursor}
              appointments={appointments}
              drag={drag}
              onDragStart={setDrag}
              onDragEnd={() => setDrag(null)}
              onDropSlot={handleDrop}
              onSelect={openEdit}
              onOpenDay={(day) => {
                setCursor(day)
                setView('day')
              }}
            />
          ) : (
            <YearGrid
              year={cursor.getFullYear()}
              appointments={appointments}
              onPickMonth={(m) => {
                setCursor(new Date(cursor.getFullYear(), m, 1))
                setView('month')
              }}
            />
          )}
        </div>

        <PatientPanel
          patients={patients}
          onDragStart={setDrag}
          onDragEnd={() => setDrag(null)}
          onPick={(p) => openNew({ patientId: p.id })}
        />
      </div>

      <Modal open={modalOpen} title={form.id ? 'Editar sessão' : 'Nova sessão'} onClose={() => setModalOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.patientId) {
              setError('Selecione um paciente')
              return
            }
            saveMutation.mutate(form)
          }}
        >
          {error && <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>}
          <div>
            <Label>Paciente *</Label>
            <Select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Selecione...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Data</Label>
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={10}
                step={5}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Modalidade</Label>
              <Select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as Modality })}>
                <option value="IN_PERSON">Presencial</option>
                <option value="ONLINE">Online</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* Cobrança da sessão: "neste dia tem que me pagar". */}
          {sessaoEditada && (
            <div className="rounded-2xl border border-ink/20 bg-cream/70 p-3">
              <p className="font-round text-[11px] font-bold uppercase tracking-wide text-ink/50">Cobrança desta sessão</p>
              {sessaoEditada.payments && sessaoEditada.payments.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {sessaoEditada.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 font-round text-sm font-bold text-ink">
                      <span>{formatCurrency(p.amount)}</span>
                      <span
                        className={`rounded-full border border-ink px-2 font-round text-[10px] font-bold uppercase tracking-wide ${
                          p.status === 'PAID' ? 'bg-emerald-500 text-white' : p.status === 'OVERDUE' ? 'bg-pop text-white' : 'bg-sun text-ink'
                        }`}
                      >
                        {p.status === 'PAID' ? 'Pago' : p.status === 'OVERDUE' ? 'Vencido' : 'A receber'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => abrirCobranca(sessaoEditada)}
                  className="mt-1.5 w-full rounded-xl border border-ink bg-sun px-3 py-2 font-round text-xs font-bold uppercase tracking-wide text-ink shadow-ink transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Este dia tem que pagar
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {form.id ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (confirm('Cancelar esta sessão? Ela fica marcada como cancelada na agenda.')) {
                      cancelMutation.mutate(form.id!)
                      setModalOpen(false)
                    }
                  }}
                >
                  Cancelar sessão
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Excluir esta sessão?')) deleteMutation.mutate(form.id!)
                  }}
                >
                  Excluir
                </Button>
              </div>
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

      {/* Modal "cobrar neste dia" */}
      <Modal open={!!cobranca} title="Cobrar nesta data" onClose={() => setCobranca(null)}>
        {cobranca && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const valor = Number(cobranca.valor)
              if (!valor || valor <= 0) {
                setCobranca({ ...cobranca, erro: 'Informe um valor maior que zero.' })
                return
              }
              cobrarMutation.mutate({ appt: cobranca.appt, valor })
            }}
          >
            {cobranca.erro && (
              <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{cobranca.erro}</div>
            )}

            <div className="rounded-2xl border border-ink bg-cream px-3 py-2">
              <p className="font-round text-sm font-bold text-ink">{cobranca.appt.patient?.name ?? 'Paciente'}</p>
              <p className="font-round text-xs font-semibold text-ink/60">
                {capitalize(formatDayLong(new Date(cobranca.appt.startAt)))} · {formatTime(cobranca.appt.startAt)}
                {cobranca.appt.modality === 'ONLINE' ? ' · Online' : ' · Presencial'}
              </p>
            </div>

            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                placeholder="150,00"
                value={cobranca.valor}
                onChange={(e) => setCobranca({ ...cobranca, valor: e.target.value })}
              />
              <p className="mt-1.5 font-round text-xs font-semibold text-ink/50">
                Vira uma cobrança “a receber” no Financeiro, com vencimento no dia da sessão.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setCobranca(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={cobrarMutation.isPending}>
                {cobrarMutation.isPending ? 'Cobrando...' : 'Marcar cobrança'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Lixeira: solte um card em cima dela para cancelar a sessão. */}
      <TrashZone
        ativo={drag?.type === 'appt'}
        dragId={drag?.type === 'appt' ? drag.id : null}
        onCancel={cancelarNaLixeira}
      />
    </div>
  )
}

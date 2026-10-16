import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { Patient, PatientProfile } from '../../types'
import { Badge, Button, EmptyState, Spinner, Textarea } from '../ui'
import { STATUS_META, durationMinutes } from '../../lib/appointments'
import { METHOD_LABEL, PAYMENT_STATUS_META, dueLabel, formatMoney } from '../../lib/finance'
import { age, avatarColor, birthdayIn, downloadJson, initials, shortDay } from '../../lib/patients'
import { formatDate, formatDateTime, formatTime } from '../../lib/format'
import { mailtoLink, whatsappLink } from '../../lib/session'
import { useAuth } from '../../lib/auth'
import { PatientPortalTab } from './PatientPortalTab'

type Tab = 'resumo' | 'sessoes' | 'financeiro' | 'portal' | 'notas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'sessoes', label: 'Sessões' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'portal', label: 'Portal' },
  { id: 'notas', label: 'Anotações' },
]

function MiniStat({ label, value, hint, tone = 'white' }: { label: string; value: string; hint?: string; tone?: 'white' | 'brand' | 'sun' | 'pop' }) {
  const tones = { white: 'bg-white', brand: 'bg-brand text-white', sun: 'bg-sun text-ink', pop: 'bg-pop text-white' }
  const dim = tone === 'white' ? 'opacity-60' : 'opacity-80'
  return (
    <div className={`rounded-2xl border border-ink p-3 shadow-ink ${tones[tone]}`}>
      <p className={`font-round text-[10px] font-bold uppercase tracking-wide ${dim}`}>{label}</p>
      <p className="mt-0.5 font-display text-lg leading-none tracking-wide">{value}</p>
      {hint && <p className={`mt-1 font-round text-[10px] font-semibold ${dim}`}>{hint}</p>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-ink/15 py-1.5 last:border-0">
      <span className="font-round text-xs font-bold uppercase tracking-wide text-ink/50">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value || 'â€”'}</span>
    </div>
  )
}

export function PatientDrawer({
  patientId,
  onClose,
  onEdit,
  onSchedule,
  onNewPayment,
  onChanged,
}: {
  patientId: string | null
  onClose: () => void
  onEdit: (p: Patient) => void
  onSchedule: (p: Patient) => void
  onNewPayment: (p: Patient) => void
  onChanged: () => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const clinicName = user?.clinicName || 'Psi Hub'
  const [tab, setTab] = useState<Tab>('resumo')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => apiFetch<PatientProfile>(`/patients/${patientId}`),
    enabled: !!patientId,
  })

  // Sincroniza as anotacoes quando o paciente carrega.
  useEffect(() => {
    setNotes(data?.notes || '')
    setSaved(false)
  }, [data?.id, data?.notes])

  // Fecha com ESC.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['patient', patientId] })
    qc.invalidateQueries({ queryKey: ['patients'] })
    qc.invalidateQueries({ queryKey: ['patientStats'] })
    onChanged()
  }

  const saveNotes = useMutation({
    mutationFn: (value: string) => apiFetch(`/patients/${patientId}`, { method: 'PUT', body: JSON.stringify({ notes: value }) }),
    onSuccess: () => {
      invalidate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'INACTIVE') =>
      apiFetch(`/patients/${patientId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  })

  const restore = useMutation({
    mutationFn: () => apiFetch(`/patients/${patientId}/restore`, { method: 'POST', body: '{}' }),
    onSuccess: invalidate,
  })

  const hardDelete = useMutation({
    mutationFn: () => apiFetch(`/patients/${patientId}?hard=true`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  if (!patientId) return null

  const p = data
  const bday = p ? birthdayIn(p.birthDate) : null
  const wa = p ? whatsappLink(p.phone, `Oi, ${p.name.split(' ')[0]}! Tudo bem?`) : null
  const mail = p ? mailtoLink(p.email, 'Contato', `Oi, ${p.name.split(' ')[0]}!`) : null
  const now = Date.now()
  const upcoming = p?.appointments.filter((a) => new Date(a.startAt).getTime() >= now && ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status)) ?? []
  const history = p?.appointments.filter((a) => !upcoming.includes(a)) ?? []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-ink bg-cream"
      >
        {isLoading || !p ? (
          <Spinner />
        ) : (
          <>
            {/* Cabecalho */}
            <div className="border-b border-ink bg-white px-5 py-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-ink font-display text-2xl tracking-wide shadow-ink ${avatarColor(p.id)}`}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-2xl uppercase leading-none tracking-wide text-ink">{p.name}</h2>
                    <Badge color={p.status === 'ACTIVE' ? 'green' : 'slate'}>{p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge>
                    {p.deletedAt && <Badge color="red">Na lixeira</Badge>}
                  </div>
                  <p className="mt-1 font-round text-xs font-bold text-ink/50">
                    {age(p.birthDate) != null ? `${age(p.birthDate)} anos` : 'idade não informada'}
                    {bday && bday.daysUntil <= 30 && (
                      <span className="text-brand">
                        {' '}
                        Â· aniversario {bday.daysUntil === 0 ? 'hoje' : `em ${bday.daysUntil} dia(s)`} ({bday.turning} anos)
                      </span>
                    )}
                    {' '}Â· paciente desde {formatDate(p.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-ink bg-emerald-300 px-2.5 py-0.5 font-round text-[11px] font-bold text-ink transition hover:brightness-105"
                      >
                        WhatsApp
                      </a>
                    )}
                    {mail && (
                      <a
                        href={mail}
                        className="inline-flex items-center gap-1 rounded-full border border-ink bg-white px-2.5 py-0.5 font-round text-[11px] font-bold text-ink transition hover:bg-ink/5"
                      >
                        E-mail
                      </a>
                    )}
                    {p.phone && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(p.phone || '')}
                        className="inline-flex items-center gap-1 rounded-full border border-ink bg-white px-2.5 py-0.5 font-round text-[11px] font-bold text-ink transition hover:bg-ink/5"
                      >
                        {p.phone}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="rounded-full border border-ink bg-white p-1.5 text-ink transition hover:bg-pop hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Acoes rapidas */}
            <div className="flex flex-wrap items-center gap-2 border-b border-ink bg-cream px-5 py-3">
              <Button onClick={() => onSchedule(p)} className="px-4 py-1.5 text-xs">
                + Sessão
              </Button>
              <Button variant="sun" onClick={() => onNewPayment(p)} className="px-4 py-1.5 text-xs">
                + Cobrança
              </Button>
              <Button variant="secondary" onClick={() => onEdit(p)} className="px-4 py-1.5 text-xs">
                Editar
              </Button>
              {p.deletedAt ? (
                <>
                  <Button variant="secondary" onClick={() => restore.mutate()} disabled={restore.isPending} className="px-4 py-1.5 text-xs">
                    Restaurar
                  </Button>
                  <Button
                    variant="danger"
                    className="px-4 py-1.5 text-xs"
                    disabled={hardDelete.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          `Excluir DEFINITIVAMENTE ${p.name}?\n\n` +
                            `${p.stats.totalAppointments} sessão(oes) e ${p.payments.length} cobrança(s) serão apagadas junto. Não tem como desfazer.`,
                        )
                      ) {
                        hardDelete.mutate()
                      }
                    }}
                  >
                    Excluir de vez
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  className="px-4 py-1.5 text-xs"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                >
                  {p.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}
                </Button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadJson(`${p.name.replace(/\s+/g, '-').toLowerCase()}-dados.json`, {
                    exportadoEm: new Date().toISOString(),
                    clinica: clinicName,
                    paciente: p,
                  })
                }
                className="ml-auto font-round text-[11px] font-bold uppercase tracking-wide text-ink/50 underline decoration-dotted hover:text-ink"
              >
                Exportar dados
              </button>
            </div>

            {/* Abas */}
            <div className="flex gap-1 border-b border-ink bg-white px-5 pt-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-t-xl border border-b-0 px-3 py-1.5 font-round text-xs font-bold uppercase tracking-wide transition ${
                    tab === t.id ? 'border-ink bg-cream text-ink' : 'border-transparent text-ink/45 hover:text-ink'
                  }`}
                >
                  {t.label}
                  {t.id === 'sessoes' && <span className="ml-1 text-ink/40">{p.stats.totalAppointments}</span>}
                  {t.id === 'financeiro' && p.stats.openCount > 0 && <span className="ml-1 text-pop">{p.stats.openCount}</span>}
                </button>
              ))}
            </div>

            {/* Conteudo */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === 'resumo' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MiniStat label="Sessões realizadas" value={String(p.stats.sessionCount)} hint={`${p.stats.noShowCount} falta(s) Â· ${p.stats.canceledCount} cancelada(s)`} />
                    <MiniStat
                      label="Frequência média"
                      value={
                        p.stats.frequencyDays == null
                          ? 'â€”'
                          : p.stats.frequencyDays === 0
                            ? 'mesmo dia'
                            : `${p.stats.frequencyDays} dia(s)`
                      }
                      hint={p.stats.firstSessionAt ? `desde ${formatDate(p.stats.firstSessionAt)}` : 'sem histórico'}
                    />
                    <MiniStat label="Ticket medio" value={formatMoney(p.stats.ticketMedio)} hint={`${p.stats.paidCount} pagamento(s)`} />
                    <MiniStat label="Total pago" value={formatMoney(p.stats.totalPaid)} tone="brand" />
                    <MiniStat label="Em aberto" value={formatMoney(p.stats.openAmount)} hint={`${p.stats.openCount} cobrança(s)`} tone={p.stats.overdueCount > 0 ? 'pop' : 'sun'} />
                    <MiniStat label="Valor da sessão" value={p.defaultSessionPrice != null ? formatMoney(p.defaultSessionPrice) : 'â€”'} hint="padrão do paciente" />
                  </div>

                  {p.stats.nextAppointment && (
                    <div className="rounded-2xl border border-ink bg-white p-4 shadow-ink">
                      <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/50">Próxima sessão</p>
                      <p className="mt-1 font-display text-xl uppercase tracking-wide text-ink">
                        {shortDay(p.stats.nextAppointment.startAt)} as {formatTime(p.stats.nextAppointment.startAt)}
                      </p>
                      <p className="mt-0.5 font-round text-xs font-semibold text-ink/60">
                        {p.stats.nextAppointment.modality === 'ONLINE' ? 'Online' : 'Presencial'} Â·{' '}
                        {durationMinutes(p.stats.nextAppointment)} min Â· {STATUS_META[p.stats.nextAppointment.status].label}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-ink bg-white p-4 shadow-ink">
                    <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/50">Dados cadastrais</p>
                    <InfoRow label="E-mail" value={p.email} />
                    <InfoRow label="Telefone" value={p.phone} />
                    <InfoRow label="CPF" value={p.document} />
                    <InfoRow label="Nascimento" value={p.birthDate ? formatDate(p.birthDate) : null} />
                    <InfoRow label="Endereço" value={p.address} />
                    <InfoRow label="Emergência" value={p.emergencyContact ? `${p.emergencyContact}${p.emergencyPhone ? ` Â· ${p.emergencyPhone}` : ''}` : null} />
                    <InfoRow label="Como conheceu" value={p.referralSource} />
                    <InfoRow label="Consentimento LGPD" value={p.consentAt ? `registrado em ${formatDate(p.consentAt)}` : 'não registrado'} />
                  </div>
                </div>
              )}

              {tab === 'sessoes' && (
                <div className="space-y-4">
                  {p.appointments.length === 0 && <EmptyState title="Nenhuma sessão" description="Ainda não há sessões registradas para este paciente." />}

                  {upcoming.length > 0 && (
                    <div>
                      <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/50">Próximas</p>
                      <div className="space-y-2">
                        {upcoming.map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink bg-white px-3 py-2 shadow-ink">
                            <div className="min-w-0 flex-1">
                              <p className="font-round text-sm font-bold text-ink">
                                {formatDate(a.startAt)} as {formatTime(a.startAt)}
                              </p>
                              <p className="font-round text-[11px] font-semibold text-ink/50">
                                {a.modality === 'ONLINE' ? 'Online' : 'Presencial'} Â· {durationMinutes(a)} min
                              </p>
                            </div>
                            <span className={`rounded-full border border-ink px-2.5 py-0.5 font-round text-[11px] font-bold ${STATUS_META[a.status].chip}`}>
                              {STATUS_META[a.status].label}
                            </span>
                            {a.meetLink && (
                              <a
                                href={a.meetLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-ink bg-brand px-2.5 py-0.5 font-round text-[11px] font-bold text-white"
                              >
                                Entrar
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {history.length > 0 && (
                    <div>
                      <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/50">Histórico</p>
                      <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink bg-white shadow-ink">
                        {history.map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-round text-sm font-bold text-ink">
                                {formatDate(a.startAt)} as {formatTime(a.startAt)}
                              </p>
                              <p className="font-round text-[11px] font-semibold text-ink/50">
                                {a.modality === 'ONLINE' ? 'Online' : 'Presencial'} Â· {durationMinutes(a)} min
                              </p>
                            </div>
                            <span className={`rounded-full border border-ink px-2.5 py-0.5 font-round text-[11px] font-bold ${STATUS_META[a.status].chip}`}>
                              {STATUS_META[a.status].label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'financeiro' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Total pago" value={formatMoney(p.stats.totalPaid)} tone="brand" />
                    <MiniStat label="Em aberto" value={formatMoney(p.stats.openAmount)} tone="sun" />
                    <MiniStat label="Em atraso" value={formatMoney(p.stats.overdueAmount)} tone={p.stats.overdueCount > 0 ? 'pop' : 'white'} />
                  </div>

                  {p.payments.length === 0 ? (
                    <EmptyState title="Nenhuma cobrança" description="Crie a primeira cobrança para este paciente." />
                  ) : (
                    <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink bg-white shadow-ink">
                      {p.payments.map((pay) => {
                        const meta = PAYMENT_STATUS_META[pay.status]
                        return (
                          <div key={pay.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-round text-sm font-bold text-ink">{pay.description || 'Atendimento psicológico'}</p>
                              <p className="font-round text-[11px] font-semibold text-ink/50">
                                venc. {formatDate(pay.dueDate)} Â· {dueLabel(pay)}
                                {pay.method ? ` Â· ${METHOD_LABEL[pay.method]}` : ''}
                              </p>
                            </div>
                            <span className="font-display text-base tracking-wide text-ink">{formatMoney(pay.amount)}</span>
                            <span className={`rounded-full border border-ink px-2.5 py-0.5 font-round text-[11px] font-bold ${meta.chip}`}>{meta.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'portal' && <PatientPortalTab patientId={p.id} clinicName={clinicName} onChanged={invalidate} />}

              {tab === 'notas' && (
                <div className="space-y-3">
                  <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/50">
                    Anotações internas (não aparecem para o paciente)
                  </p>
                  <Textarea
                    rows={12}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações do acompanhamento, encaminhamentos, preferencias de horário..."
                  />
                  <div className="flex items-center justify-end gap-3">
                    {saved && <span className="font-round text-xs font-bold text-emerald-600">anotações salvas!</span>}
                    <Button onClick={() => saveNotes.mutate(notes)} disabled={saveNotes.isPending || notes === (p.notes || '')}>
                      {saveNotes.isPending ? 'Salvando...' : 'Salvar anotações'}
                    </Button>
                  </div>
                  <p className="font-round text-[11px] font-semibold text-ink/40">
                    Última atualização do cadastro: {formatDateTime(p.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

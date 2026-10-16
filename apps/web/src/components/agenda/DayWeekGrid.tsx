import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { Appointment } from '../../types'
import type { DragPayload } from '../../lib/appointments'
import { STATUS_META, durationMinutes, layoutOverlaps } from '../../lib/appointments'
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  WEEKDAYS_SHORT,
  formatHourMinute,
  isToday,
  minutesOfDay,
  snapMinutes,
  toDateKey,
} from '../../lib/date'

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT
const GUTTER = 56

interface Props {
  days: Date[]
  appointments: Appointment[]
  drag: DragPayload
  onDragStart: (payload: DragPayload) => void
  onDragEnd: () => void
  onDropSlot: (day: Date, minutes: number) => void
  onSelect: (a: Appointment) => void
  /** Abre o "cobrar nesta data" (ação rápida do card). */
  onCharge?: (a: Appointment) => void
}

export function DayWeekGrid({ days, appointments, drag, onDragStart, onDragEnd, onDropSlot, onSelect, onCharge }: Props) {
  const [hint, setHint] = useState<{ key: string; minutes: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Posiciona a rolagem proximo das 8h sempre que o modo dia/semana muda.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - DAY_START_HOUR) * HOUR_HEIGHT
  }, [days.length])

  // Converte a posicao do ponteiro em minutos do dia (arredondado em 15 min).
  function minutesFromEvent(e: DragEvent): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutes = snapMinutes(DAY_START_HOUR * 60 + (y / HOUR_HEIGHT) * 60, 15)
    return Math.max(DAY_START_HOUR * 60, Math.min(DAY_END_HOUR * 60 - 15, minutes))
  }

  function handleOver(e: DragEvent, key: string) {
    if (!drag) return
    e.preventDefault()
    setHint({ key, minutes: minutesFromEvent(e) })
  }

  function handleDrop(e: DragEvent, day: Date) {
    if (!drag) return
    e.preventDefault()
    const minutes = minutesFromEvent(e)
    setHint(null)
    onDropSlot(day, minutes)
  }

  const nowMinutes = minutesOfDay(new Date())
  const showNow = nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60

  return (
    <div className="sticker overflow-hidden rounded-3xl bg-white">
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 580 }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {/* Cabecalho */}
          <div className="sticky top-0 z-40 border-b border-ink bg-white" />
          {days.map((d) => {
            const today = isToday(d)
            return (
              <div key={toDateKey(d)} className="sticky top-0 z-40 border-b border-l border-ink bg-white py-2 text-center">
                <p className="font-round text-[11px] font-bold uppercase tracking-wide text-ink/50">{WEEKDAYS_SHORT[d.getDay()]}</p>
                <p
                  className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full font-display text-lg ${
                    today ? 'bg-brand text-white' : 'text-ink'
                  }`}
                >
                  {d.getDate()}
                </p>
              </div>
            )
          })}

          {/* Gutter de horas */}
          <div className="relative">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-2 font-round text-[11px] font-bold text-ink/40">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {days.map((day) => {
            const key = toDateKey(day)
            const list = appointments.filter((a) => toDateKey(new Date(a.startAt)) === key)
            const today = isToday(day)
            return (
              <div
                key={key}
                data-day={key}
                className={`relative border-l border-ink ${hint?.key === key ? 'bg-brand/5' : ''}`}
                style={{ height: TOTAL_HEIGHT }}
                onDragOver={(e) => handleOver(e, key)}
                onDrop={(e) => handleDrop(e, day)}
                onDragLeave={() => setHint((h) => (h?.key === key ? null : h))}
              >
                {HOURS.map((h) => (
                  <div key={h} className="border-b border-ink/10" style={{ height: HOUR_HEIGHT }} />
                ))}

                {today && showNow && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 border-t border-pop"
                    style={{ top: ((nowMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                  >
                    <span className="absolute -left-1.5 -top-[5px] h-2.5 w-2.5 rounded-full bg-pop" />
                  </div>
                )}

                {hint?.key === key && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30 border-t border-brand"
                    style={{ top: ((hint.minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                  >
                    <span className="absolute -top-2 right-0 rounded-full border border-ink bg-brand px-1.5 font-round text-[9px] font-bold text-white">
                      {formatHourMinute(hint.minutes)}
                    </span>
                  </div>
                )}

                {layoutOverlaps(list).map(({ item: a, lane, laneCount }) => {
                  const start = new Date(a.startAt)
                  const top = ((minutesOfDay(start) - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT
                  const height = Math.max(24, (durationMinutes(a) / 60) * HOUR_HEIGHT - 3)
                  const meta = STATUS_META[a.status]
                  const widthPct = 100 / laneCount
                  const cobrancas = a.payments ?? []
                  const temCobranca = cobrancas.length > 0
                  const quitada = temCobranca && cobrancas.every((p) => p.status === 'PAID')
                  return (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      data-appt-id={a.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', a.id)
                        onDragStart({ type: 'appt', id: a.id })
                      }}
                      onDragEnd={onDragEnd}
                      onClick={() => onSelect(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(a)
                        }
                      }}
                      title={`${a.patient?.name ?? 'Paciente'} · ${meta.label} · ${formatHourMinute(minutesOfDay(start))}`}
                      className={`group absolute z-10 cursor-grab overflow-hidden rounded-lg border border-ink px-1.5 py-1 text-left transition hover:brightness-[0.97] active:cursor-grabbing ${meta.chip}`}
                      style={{
                        top,
                        height,
                        left: `calc(${lane * widthPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                      }}
                    >
                      <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
                      <span className="block truncate pl-1.5 pr-6 font-round text-[11px] font-bold leading-tight text-ink">
                        {a.patient?.name ?? 'Paciente'}
                      </span>
                      {height > 36 && (
                        <span className="block truncate pl-1.5 font-round text-[10px] font-semibold text-ink/60">
                          {formatHourMinute(minutesOfDay(start))} · {a.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                        </span>
                      )}

                      {/* cobrança vinculada a esta sessão */}
                      {temCobranca && (
                        <span
                          className={`absolute right-1 top-1 rounded-full border border-ink px-1 font-round text-[8px] font-bold leading-[1.4] ${
                            quitada ? 'bg-emerald-500 text-white' : 'bg-sun text-ink'
                          }`}
                          title={quitada ? 'Sessão paga' : 'A receber no Financeiro'}
                        >
                          {quitada ? '✓' : 'R$'}
                        </span>
                      )}

                      {/* atalho: "neste dia tem que me pagar" */}
                      {onCharge && !temCobranca && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCharge(a)
                          }}
                          title="Marcar: neste dia o paciente paga"
                          className="absolute bottom-1 right-1 rounded-full border border-ink bg-white px-1.5 font-round text-[9px] font-bold leading-[1.5] text-ink opacity-0 shadow-ink transition group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          R$ cobrar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

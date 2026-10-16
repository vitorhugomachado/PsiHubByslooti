import { useState } from 'react'
import type { DragEvent } from 'react'
import type { Appointment } from '../../types'
import type { DragPayload } from '../../lib/appointments'
import { STATUS_META } from '../../lib/appointments'
import { addDays, formatHourMinute, isSameDay, isToday, minutesOfDay, startOfMonth, startOfWeek, toDateKey, WEEKDAYS_SHORT } from '../../lib/date'

interface Props {
  monthDate: Date
  appointments: Appointment[]
  drag: DragPayload
  onDragStart: (payload: DragPayload) => void
  onDragEnd: () => void
  onDropSlot: (day: Date, minutes: number | null) => void
  onSelect: (a: Appointment) => void
  onOpenDay: (day: Date) => void
}

const MAX_CHIPS = 3

export function MonthGrid({ monthDate, appointments, drag, onDragStart, onDragEnd, onDropSlot, onSelect, onOpenDay }: Props) {
  const [hint, setHint] = useState<string | null>(null)

  const first = startOfWeek(startOfMonth(monthDate))
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const month = monthDate.getMonth()

  function handleDrop(e: DragEvent, day: Date) {
    if (!drag) return
    e.preventDefault()
    setHint(null)
    onDropSlot(day, null)
  }

  return (
    <div className="sticker overflow-hidden rounded-3xl bg-white">
      <div className="grid grid-cols-7 border-b border-ink">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="border-l border-ink py-2 text-center font-round text-[11px] font-bold uppercase tracking-wide text-ink/50 first:border-l-0">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = toDateKey(day)
          const list = appointments
            .filter((a) => isSameDay(new Date(a.startAt), day))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          const inMonth = day.getMonth() === month
          const today = isToday(day)
          const isDropTarget = hint === key
          return (
            <div
              key={key}
              data-day={key}
              onDragOver={(e) => {
                if (!drag) return
                e.preventDefault()
                setHint(key)
              }}
              onDragLeave={() => setHint((h) => (h === key ? null : h))}
              onDrop={(e) => handleDrop(e, day)}
              onDoubleClick={() => onOpenDay(day)}
              className={`min-h-[110px] border-b border-l border-ink p-1.5 transition ${
                i % 7 === 0 ? 'border-l-0' : ''
              } ${!inMonth ? 'bg-cream/60' : 'bg-white'} ${isDropTarget ? 'bg-brand/10' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  onClick={() => onOpenDay(day)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-round text-xs font-bold transition hover:bg-ink/10 ${
                    today ? 'bg-brand text-white' : inMonth ? 'text-ink' : 'text-ink/30'
                  }`}
                >
                  {day.getDate()}
                </button>
                {list.length > 0 && <span className="font-round text-[10px] font-bold text-ink/40">{list.length}</span>}
              </div>

              <div className="space-y-1">
                {list.slice(0, MAX_CHIPS).map((a) => {
                  const meta = STATUS_META[a.status]
                  return (
                    <button
                      key={a.id}
                      draggable
                      data-appt-id={a.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', a.id)
                        onDragStart({ type: 'appt', id: a.id })
                      }}
                      onDragEnd={onDragEnd}
                      onClick={() => onSelect(a)}
                      className={`flex w-full cursor-grab items-center gap-1 overflow-hidden rounded-md border border-ink px-1 py-0.5 text-left active:cursor-grabbing ${meta.chip}`}
                      title={`${a.patient?.name ?? 'Paciente'} · ${meta.label}`}
                    >
                      <span className="truncate font-round text-[10px] font-bold text-ink">{a.patient?.name ?? 'Paciente'}</span>
                      <span className="ml-auto shrink-0 font-round text-[9px] font-semibold text-ink/50">
                        {formatHourMinute(minutesOfDay(new Date(a.startAt)))}
                      </span>
                    </button>
                  )
                })}
                {list.length > MAX_CHIPS && (
                  <button onClick={() => onOpenDay(day)} className="w-full text-left font-round text-[10px] font-bold text-brand hover:underline">
                    +{list.length - MAX_CHIPS} mais
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

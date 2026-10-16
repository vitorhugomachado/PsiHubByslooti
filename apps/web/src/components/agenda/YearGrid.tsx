import type { Appointment } from '../../types'
import { MONTHS } from '../../lib/date'

interface Props {
  year: number
  appointments: Appointment[]
  onPickMonth: (monthIndex: number) => void
}

export function YearGrid({ year, appointments, onPickMonth }: Props) {
  const byMonth = Array.from({ length: 12 }, () => 0)
  for (const a of appointments) {
    const d = new Date(a.startAt)
    if (d.getFullYear() === year) byMonth[d.getMonth()]++
  }
  const max = Math.max(1, ...byMonth)

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {MONTHS.map((name, i) => {
        const count = byMonth[i]
        const pct = Math.round((count / max) * 100)
        return (
          <button
            key={name}
            onClick={() => onPickMonth(i)}
            className="sticker sticker-press rounded-2xl bg-white p-4 text-left"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg uppercase tracking-wide text-ink">{name}</span>
              <span className="font-round text-sm font-bold text-brand">{count}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink bg-cream">
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 font-round text-[11px] font-semibold text-ink/50">
              {count === 0 ? 'Sem sessões' : count === 1 ? '1 sessão' : `${count} sessões`}
            </p>
          </button>
        )
      })}
    </div>
  )
}

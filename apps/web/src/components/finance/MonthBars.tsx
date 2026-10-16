import { compactBRL, formatMoney } from '../../lib/finance'

const CHART_HEIGHT = 150

// Grafico de barras dos recebimentos mensais (CSS puro, sem dependencias).
export function MonthBars({ data }: { data: { label: string; year: number; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total))

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {data.map((d, i) => {
        const height = Math.max((d.total / max) * CHART_HEIGHT, d.total > 0 ? 6 : 3)
        const isCurrent = i === data.length - 1
        return (
          <div key={`${d.year}-${d.label}-${i}`} className="group flex flex-1 flex-col items-center">
            <span className="mb-1 font-round text-[10px] font-bold text-ink/50 sm:text-[11px]">
              {d.total > 0 ? compactBRL(d.total) : ''}
            </span>
            <div className="flex w-full items-end" style={{ height: CHART_HEIGHT }}>
              <div
                title={`${d.label} ${d.year}: ${formatMoney(d.total)}`}
                className={`w-full rounded-t-xl border border-ink transition-all duration-300 group-hover:brightness-105 ${
                  isCurrent ? 'bg-brand' : d.total > 0 ? 'bg-brand-light' : 'bg-ink/5'
                }`}
                style={{ height }}
              />
            </div>
            <span className={`mt-1.5 font-round text-[11px] font-bold uppercase tracking-wide ${isCurrent ? 'text-brand' : 'text-ink/50'}`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

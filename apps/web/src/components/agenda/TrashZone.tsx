import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'

/* Partículas da fumacinha quando a lixeira engole um card. */
const FUMACA = [
  { x: -26, y: -30 },
  { x: 2, y: -42 },
  { x: 26, y: -28 },
  { x: -36, y: -10 },
  { x: 34, y: -12 },
]

/* ============================================================================
   Lixeira da agenda
   ----------------------------------------------------------------------------
   Aparece só enquanto um agendamento está sendo arrastado. Soltar o card em
   cima dela cancela a sessão (o "sugão" do card é animado pelo Agenda.tsx,
   que encontra este elemento pelo id).
   ========================================================================== */
export function TrashZone({
  ativo,
  dragId,
  onCancel,
}: {
  /** true enquanto um agendamento está sendo arrastado. */
  ativo: boolean
  /** Id do agendamento arrastado. */
  dragId: string | null
  /** Chamado no drop (a animação e o cancelamento ficam com o pai). */
  onCancel: (id: string) => void
}) {
  const [fome, setFome] = useState(false)
  const [engolindo, setEngolindo] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!ativo) setFome(false)
  }, [ativo])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  if (!ativo && !engolindo) return null

  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const id = dragId || e.dataTransfer.getData('text/plain')
    setFome(false)
    if (!id) return
    setEngolindo(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setEngolindo(false), 950)
    onCancel(id)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center sm:bottom-8">
      <div className={engolindo ? 'bin-gulp relative' : 'relative'}>
        {engolindo &&
          FUMACA.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="bin-puff pointer-events-none absolute left-1/2 top-3 h-2 w-2 rounded-full border border-ink bg-white"
              style={
                {
                  '--puff-x': `${p.x}px`,
                  '--puff-y': `${p.y}px`,
                  animationDelay: `${i * 45}ms`,
                } as CSSProperties
              }
            />
          ))}

        <div
          id="lixeira-agenda"
          data-fome={fome}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (!fome) setFome(true)
          }}
          onDragLeave={() => setFome(false)}
          onDrop={soltar}
          style={{ transform: fome ? 'scale(1.14)' : undefined }}
          className={`pointer-events-auto flex w-[196px] select-none flex-col items-center gap-1 rounded-3xl border border-ink px-3 py-2.5 text-center shadow-ink-lg transition-transform duration-150 ${
            fome ? 'bg-pop text-white' : 'bg-sun text-ink'
          }`}
        >
          <div className={ativo && !fome ? 'bin-wait' : ''}>
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* tampa (abre quando o card está por cima) */}
              <g className="bin-tampa">
                <path d="M3.6 6.4h16.8" />
                <path d="M9.4 6.4V4.7c0-.65.55-1.2 1.2-1.2h2.8c.65 0 1.2.55 1.2 1.2v1.7" />
              </g>
              {/* corpo */}
              <path d="M5.6 6.4l.9 12.1c.07.9.8 1.6 1.7 1.6h7.6c.9 0 1.63-.7 1.7-1.6l.9-12.1" />
              <path d="M10.2 10.4v6.4M13.8 10.4v6.4" />
              {/* carinha faminta */}
              <g className="bin-carinha" fill="currentColor" stroke="none">
                <circle cx="9.7" cy="11.4" r="1.05" />
                <circle cx="14.3" cy="11.4" r="1.05" />
              </g>
            </svg>
          </div>
          <p className="font-round text-[11px] font-bold uppercase leading-tight tracking-wide">
            {fome ? 'Pode soltar!' : 'Arraste aqui para cancelar'}
          </p>
        </div>
      </div>
    </div>
  )
}

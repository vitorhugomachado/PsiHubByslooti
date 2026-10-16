import type { Appointment } from '../../types'
import { STATUS_META, durationMinutes } from '../../lib/appointments'
import { relativeToStart, sessionElapsed } from '../../lib/session'
import { formatTime } from '../../lib/format'

interface Props {
  appointments: Appointment[]
  now: Date
  pendingId: string | null
  copiedId: string | null
  onOpenCall: (a: Appointment) => void
  onStart: (a: Appointment) => void
  onFinish: (a: Appointment) => void
  onCopy: (a: Appointment) => void
  onShareWhatsApp: (a: Appointment) => string | null
  onShareEmail: (a: Appointment) => string | null
  onOpenInAgenda: (a: Appointment) => void
}

const tone: Record<string, string> = {
  white: 'bg-white',
  brand: 'bg-brand text-white',
  green: 'bg-emerald-400 text-ink',
  sun: 'bg-sun text-ink',
  pop: 'bg-pop text-white',
}

function SmallBtn({
  children,
  onClick,
  variant = 'white',
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: keyof typeof tone
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink px-3 py-1 font-round text-xs font-bold uppercase tracking-wide shadow-ink transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${tone[variant]}`}
    >
      {children}
    </button>
  )
}

function LinkChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-2.5 py-0.5 font-round text-[11px] font-bold uppercase tracking-wide text-ink transition hover:bg-brand hover:text-white"
    >
      {children}
    </a>
  )
}

function IconVideo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="M15 10.5 22 7v10l-7-3.5z" />
    </svg>
  )
}

export function DayTimeline({
  appointments,
  now,
  pendingId,
  copiedId,
  onOpenCall,
  onStart,
  onFinish,
  onCopy,
  onShareWhatsApp,
  onShareEmail,
  onOpenInAgenda,
}: Props) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/60 py-10 text-center">
        <p className="font-display text-lg uppercase tracking-wide text-ink/60">Dia livre</p>
        <p className="mt-1 text-sm font-semibold text-ink/50">Nenhuma sessão agendada para hoje.</p>
      </div>
    )
  }

  const nowIndex = appointments.findIndex((a) => new Date(a.startAt).getTime() > now.getTime())
  const markerAt = nowIndex === -1 ? appointments.length : nowIndex

  return (
    <ol className="relative">
      {appointments.map((a, i) => {
        const meta = STATUS_META[a.status]
        const isInProgress = a.status === 'IN_PROGRESS'
        const isDone = a.status === 'DONE'
        const closed = isDone || a.status === 'CANCELED' || a.status === 'NO_SHOW'
        const rel = relativeToStart(a.startAt, now)
        const elapsed = sessionElapsed(a, now)
        const pending = pendingId === a.id
        const whatsapp = onShareWhatsApp(a)
        const email = onShareEmail(a)

        const rows: React.ReactNode[] = []

        if (i === markerAt) rows.push(<NowMarker key="now" />)

        rows.push(
          <li key={a.id} className="grid grid-cols-[3.25rem_1.1rem_1fr] gap-2 py-1.5">
            <div className="pt-2.5 text-right">
              <p className="font-display text-sm leading-none tracking-wide text-ink">{formatTime(a.startAt)}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink/40">{formatTime(a.endAt)}</p>
            </div>
            <div className="relative flex justify-center">
              <span className="absolute -bottom-3 top-0 w-px bg-ink/10" />
              <span className={`relative mt-3 h-3 w-3 shrink-0 rounded-full border border-ink ${meta.dot}`} />
            </div>
            <div
              className={`sticker rounded-2xl p-3.5 ${
                isInProgress ? 'bg-amber-50' : closed ? 'bg-white/70' : 'bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-round text-lg font-bold leading-tight text-ink ${closed ? 'opacity-60' : ''}`}>
                    {a.patient?.name || 'Paciente'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border border-ink px-2.5 py-0.5 font-round text-[11px] font-bold ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <span className="font-round text-[11px] font-bold text-ink/50">
                      {a.modality === 'ONLINE' ? 'Online' : 'Presencial'} Â· {durationMinutes(a)} min
                    </span>
                    {isInProgress && elapsed && (
                      <span className="inline-flex items-center gap-1 font-round text-[11px] font-bold text-amber-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        {elapsed} em andamento
                      </span>
                    )}
                    {!closed && !isInProgress && (
                      <span className={`font-round text-[11px] font-bold ${rel.minutes < 0 ? 'text-pop' : 'text-brand'}`}>{rel.label}</span>
                    )}
                    {isDone && elapsed && <span className="font-round text-[11px] font-bold text-ink/40">durou {elapsed}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenInAgenda(a)}
                  className="shrink-0 rounded-full border border-ink bg-white px-2.5 py-0.5 font-round text-[11px] font-bold uppercase tracking-wide text-ink/70 transition hover:bg-sun hover:text-ink"
                >
                  Abrir
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isInProgress ? (
                  <>
                    <SmallBtn variant="brand" disabled={pending} onClick={() => onOpenCall(a)}>
                      <IconVideo /> Entrar na call
                    </SmallBtn>
                    <SmallBtn variant="pop" disabled={pending} onClick={() => onFinish(a)}>
                      Finalizar sessão
                    </SmallBtn>
                  </>
                ) : closed ? (
                  <SmallBtn disabled={pending} onClick={() => onOpenInAgenda(a)}>
                    Ver detalhes
                  </SmallBtn>
                ) : (
                  <>
                    <SmallBtn variant="green" disabled={pending} onClick={() => onStart(a)}>
                      {pending ? 'Iniciando...' : 'Iniciar sessão'}
                    </SmallBtn>
                    <SmallBtn variant="brand" disabled={pending} onClick={() => onOpenCall(a)}>
                      <IconVideo /> {a.meetLink ? 'Entrar na call' : 'Gerar link da call'}
                    </SmallBtn>
                  </>
                )}
              </div>

              {a.meetLink && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/15 pt-2">
                  <span className="font-round text-[11px] font-bold uppercase tracking-wide text-ink/40">Enviar link</span>
                  {whatsapp && <LinkChip href={whatsapp}>WhatsApp</LinkChip>}
                  {email && <LinkChip href={email}>E-mail</LinkChip>}
                  <button
                    type="button"
                    onClick={() => onCopy(a)}
                    className="rounded-full border border-ink bg-white px-2.5 py-0.5 font-round text-[11px] font-bold uppercase tracking-wide text-ink transition hover:bg-brand hover:text-white"
                  >
                    Copiar
                  </button>
                  {copiedId === a.id && <span className="font-round text-[11px] font-bold text-emerald-600">link copiado!</span>}
                </div>
              )}
            </div>
          </li>,
        )

        return rows
      })}
      {markerAt === appointments.length && <NowMarker />}
    </ol>
  )
}

function NowMarker() {
  return (
    <li className="grid grid-cols-[3.25rem_1.1rem_1fr] items-center gap-2 py-1">
      <span className="text-right font-round text-[10px] font-bold uppercase tracking-wide text-brand">agora</span>
      <span className="flex justify-center">
        <span className="h-2 w-2 rounded-full bg-brand ring-4 ring-brand/20" />
      </span>
      <span className="h-px bg-brand/40" />
    </li>
  )
}

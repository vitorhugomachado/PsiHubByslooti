import { Badge, Button } from '../ui'
import { formatTime } from '../../lib/format'
import { SESSION_STATUS_META, downloadIcs, isUpcoming, type PortalAppointment } from '../../lib/portal'

/* ============================================================================
   Cartao de sessao do portal: data, status e as acoes do paciente
   (confirmar presenca, entrar na sala e salvar no calendario).
   ========================================================================== */

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const MONTH = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function DateBlock({ iso, tone }: { iso: string; tone: 'brand' | 'plain' }) {
  const d = new Date(iso)
  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-ink shadow-ink ${
        tone === 'brand' ? 'bg-brand text-white' : 'bg-white text-ink'
      }`}
    >
      <span className="font-round text-[10px] font-bold uppercase leading-none tracking-wide opacity-80">{WEEKDAY[d.getDay()]}</span>
      <span className="font-display text-2xl leading-none tracking-wide">{d.getDate()}</span>
      <span className="font-round text-[10px] font-bold uppercase leading-none tracking-wide opacity-80">{MONTH[d.getMonth()]}</span>
    </div>
  )
}

export function SessionCard({
  appointment,
  clinicName,
  onConfirm,
  confirming = false,
  highlight = false,
}: {
  appointment: PortalAppointment
  clinicName: string
  onConfirm?: (id: string) => void
  confirming?: boolean
  highlight?: boolean
}) {
  const meta = SESSION_STATUS_META[appointment.status] ?? { label: appointment.status, tone: 'bg-slate-200 text-ink' }
  const upcoming = isUpcoming(appointment)
  const canConfirm = upcoming && !appointment.confirmedAt && appointment.status === 'SCHEDULED'
  const online = appointment.modality === 'ONLINE'

  return (
    <div className={`sticker rounded-3xl p-4 ${highlight ? 'bg-brand-light' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <DateBlock iso={appointment.startAt} tone={highlight ? 'brand' : 'plain'} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg uppercase leading-none tracking-wide text-ink">{formatTime(appointment.startAt)}</p>
            <Badge color={appointment.status === 'NO_SHOW' ? 'red' : appointment.status === 'DONE' ? 'green' : 'blue'}>{meta.label}</Badge>
            {(appointment.status === 'IN_PROGRESS' || (online && upcoming)) && (
              <Badge color="amber">{online ? 'Online' : 'Presencial'}</Badge>
            )}
          </div>

          <p className="mt-1.5 font-round text-xs font-semibold text-ink/60">
            {appointment.durationMin} min Â· {appointment.professional}
          </p>

          {appointment.confirmedAt ? (
            <p className="mt-1.5 flex items-center gap-1 font-round text-xs font-bold text-emerald-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Presença confirmada{appointment.confirmedBy === 'CLINIC' ? ' pela clínica' : ''}
            </p>
          ) : (
            canConfirm && <p className="mt-1.5 font-round text-xs font-semibold text-ink/45">Confirme para o seu psicólogo saber que você vem.</p>
          )}
        </div>
      </div>

      {(upcoming || appointment.status === 'DONE') && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-ink/15 pt-3">
          {canConfirm && onConfirm && (
            <Button
              variant="primary"
              disabled={confirming}
              onClick={() => onConfirm(appointment.id)}
              className="!px-4 !py-1.5 !text-xs"
            >
              {confirming ? 'Confirmando...' : 'Confirmar presença'}
            </Button>
          )}

          {appointment.meetLink && (
            <a
              href={appointment.meetLink}
              target="_blank"
              rel="noreferrer"
              className="sticker sticker-press inline-flex items-center gap-2 rounded-full bg-hub px-4 py-1.5 font-round text-xs font-bold uppercase tracking-wide text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m23 7-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
              </svg>
              Entrar na sessão
            </a>
          )}

          {!appointment.meetLink && online && upcoming && (
            <span className="self-center font-round text-[11px] font-semibold text-ink/45">
              O link da videochamada aparece aqui quando estiver disponível.
            </span>
          )}

          <button
            type="button"
            onClick={() => downloadIcs(appointment, clinicName)}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-3 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide text-ink transition hover:bg-cream"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 11v6M9 14h6" />
            </svg>
            Salvar no calendário
          </button>
        </div>
      )}
    </div>
  )
}

import type { Appointment, AppointmentStatus } from '../types'

// Aparencia de cada status de agendamento.
export const STATUS_META: Record<AppointmentStatus, { label: string; chip: string; bar: string; dot: string }> = {
  SCHEDULED: { label: 'Agendada', chip: 'bg-brand-light', bar: 'bg-brand', dot: 'bg-brand' },
  CONFIRMED: { label: 'Confirmada', chip: 'bg-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  IN_PROGRESS: { label: 'Em andamento', chip: 'bg-amber-300', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  DONE: { label: 'Realizada', chip: 'bg-slate-200', bar: 'bg-slate-500', dot: 'bg-slate-500' },
  CANCELED: { label: 'Cancelada', chip: 'bg-pop/20', bar: 'bg-pop', dot: 'bg-pop' },
  NO_SHOW: { label: 'Faltou', chip: 'bg-sun', bar: 'bg-amber-500', dot: 'bg-amber-500' },
}

export const STATUS_ORDER: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELED', 'NO_SHOW']

export function durationMinutes(a: Pick<Appointment, 'startAt' | 'endAt'>): number {
  return Math.round((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60_000)
}

// Carga arrastada na agenda: um agendamento existente ou um paciente novo.
export type DragPayload = { type: 'appt' | 'patient'; id: string } | null

export interface Positioned<T> {
  item: T
  lane: number
  laneCount: number
}

// Distribui agendamentos que se sobrepoem em "faixas" lado a lado.
export function layoutOverlaps<T extends { startAt: string; endAt: string }>(items: T[]): Positioned<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime() || new Date(a.endAt).getTime() - new Date(b.endAt).getTime(),
  )
  const out: Positioned<T>[] = []
  let cluster: T[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (!cluster.length) return
    const laneEnds: number[] = []
    const assigned = cluster.map((it) => {
      const s = new Date(it.startAt).getTime()
      const e = new Date(it.endAt).getTime()
      let lane = laneEnds.findIndex((end) => end <= s)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(e)
      } else {
        laneEnds[lane] = e
      }
      return { item: it, lane }
    })
    const laneCount = laneEnds.length
    assigned.forEach((a) => out.push({ ...a, laneCount }))
    cluster = []
  }

  for (const it of sorted) {
    const s = new Date(it.startAt).getTime()
    const e = new Date(it.endAt).getTime()
    if (cluster.length && s >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, e)
  }
  flush()
  return out
}

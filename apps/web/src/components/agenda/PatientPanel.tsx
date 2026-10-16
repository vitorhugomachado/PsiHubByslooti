import { useState } from 'react'
import type { Patient } from '../../types'
import type { DragPayload } from '../../lib/appointments'

interface Props {
  patients: Patient[]
  selectedPatientId?: string
  onDragStart: (payload: DragPayload) => void
  onDragEnd: () => void
  onPick: (patient: Patient) => void
}

export function PatientPanel({ patients, selectedPatientId, onDragStart, onDragEnd, onPick }: Props) {
  const [search, setSearch] = useState('')
  const list = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticker rounded-3xl bg-white p-3">
        <h3 className="mb-2 font-display text-base uppercase tracking-wide text-ink">Pacientes</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="mb-3 w-full rounded-xl border border-ink px-2.5 py-1.5 font-round text-sm font-semibold placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-brand/35"
        />
        <p className="mb-2 font-round text-[11px] font-semibold leading-tight text-ink/50">
          Arraste um paciente para um horário da agenda para agendar uma sessão.
        </p>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {list.length === 0 && <p className="py-4 text-center font-round text-sm text-ink/40">Nenhum paciente</p>}
          {list.map((p) => (
            <button
              key={p.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', p.id)
                onDragStart({ type: 'patient', id: p.id })
              }}
              onDragEnd={onDragEnd}
              onClick={() => onPick(p)}
              className={`flex w-full cursor-grab items-center gap-2 rounded-xl border border-ink px-2.5 py-1.5 text-left transition active:cursor-grabbing ${
                selectedPatientId === p.id ? 'bg-brand text-white' : 'bg-white hover:bg-cream'
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink font-round text-[11px] font-bold ${selectedPatientId === p.id ? 'bg-white text-brand' : 'bg-brand-light text-ink'}`}>
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-round text-sm font-bold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

import type { PatientListItem } from '../types'
import { formatDate } from './format'

// Paleta dos avatares (a cor e escolhida de forma deterministica pelo id/nome).
const AVATAR_COLORS = [
  'bg-brand text-white',
  'bg-sun text-ink',
  'bg-emerald-300 text-ink',
  'bg-pop text-white',
  'bg-purple-300 text-ink',
  'bg-teal-300 text-ink',
  'bg-orange-300 text-ink',
  'bg-pink-300 text-ink',
]

export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// "Joao Pedro Alves" -> "JA"
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function age(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--
  return years
}

// Quantos dias faltam para o proximo aniversario.
export function birthdayIn(birthDate?: string | null): { day: number; daysUntil: number; turning: number } | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate())
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate())
  return {
    day: b.getDate(),
    daysUntil: Math.round((next.getTime() - today.getTime()) / 86_400_000),
    turning: next.getFullYear() - b.getFullYear(),
  }
}

export const REFERRAL_OPTIONS = ['Indicação', 'Instagram', 'Google', 'Site', 'Convênio', 'Outro']

// ---------- Exportacao ----------

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

// CSV com ; (abre direto no Excel em portugues).
export function patientsToCsv(list: PatientListItem[]): string {
  const header = [
    'Nome', 'E-mail', 'Telefone', 'Nascimento', 'Idade', 'CPF', 'Status',
    'Sessões realizadas', 'Última sessão', 'Próxima sessão',
    'Total pago', 'Em aberto', 'Como conheceu', 'Endereço',
    'Contato de emergência', 'Telefone de emergência', 'Cadastrado em',
  ]
  const rows = list.map((p) => [
    p.name,
    p.email || '',
    p.phone || '',
    p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : '',
    age(p.birthDate) ?? '',
    p.document || '',
    p.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
    p.sessionCount,
    p.lastSessionAt ? new Date(p.lastSessionAt).toLocaleDateString('pt-BR') : '',
    p.nextAppointment ? new Date(p.nextAppointment.startAt).toLocaleString('pt-BR') : '',
    p.paidTotal.toFixed(2).replace('.', ','),
    p.openAmount.toFixed(2).replace('.', ','),
    p.referralSource || '',
    p.address || '',
    p.emergencyContact || '',
    p.emergencyPhone || '',
    new Date(p.createdAt).toLocaleDateString('pt-BR'),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, csv: string) {
  // BOM para o Excel reconhecer os acentos.
  download(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;')
}

export function downloadJson(filename: string, data: unknown) {
  download(filename, JSON.stringify(data, null, 2), 'application/json')
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Retorna "hoje", "amanha" ou a data curta.
export function shortDay(value?: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanha'
  if (diff === -1) return 'ontem'
  return formatDate(value)
}

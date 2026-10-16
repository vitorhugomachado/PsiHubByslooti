const TOKEN_KEY = 'psihub.portal.token'
const PATIENT_KEY = 'psihub.portal.patient'

/* ============================================================================
   Portal do paciente: sessao, chamadas a API e utilidades.
   O paciente tem o proprio token — separado do token da clinica.
   ========================================================================== */

export type PortalPatient = {
  id: string
  name: string
  email: string | null
  phone: string
  clinicName: string
  pixKey: string | null
}

export type PortalAppointment = {
  id: string
  startAt: string
  endAt: string
  status: string
  modality: string
  confirmedAt: string | null
  confirmedBy: string | null
  meetLink: string | null
  professional: string
  durationMin: number
}

export type PortalPayment = {
  id: string
  amount: number
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  method: string | null
  description: string | null
  dueDate: string
  paidAt: string | null
}

export type PortalMessage = {
  id: string
  author: 'PATIENT' | 'CLINIC'
  body: string
  createdAt: string
  readAt: string | null
}

export type PortalDocument = {
  id: string
  title: string
  kind: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
}

export type PortalMaterial = {
  id: string
  title: string
  kind: string
  url: string
  note: string | null
  createdAt: string
}

export type PortalTask = {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  doneAt: string | null
  createdAt: string
}

export type PortalProof = {
  id: string
  fileName: string
  size: number
  note: string | null
  paymentId: string | null
  reviewedAt: string | null
  createdAt: string
}

export type PortalOverview = {
  next: PortalAppointment | null
  upcoming: number
  openAmount: number
  overdueAmount: number
  openCount: number
  unreadMessages: number
  pendingTasks: number
  materials: number
  proofs: number
}

export type PortalFinance = {
  payments: PortalPayment[]
  summary: {
    openAmount: number
    overdueAmount: number
    paidTotal: number
    openCount: number
    paidCount: number
  }
  pixKey: string | null
}

export class PortalError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'PortalError'
    this.status = status
  }
}

export function getPortalToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getPortalPatient(): PortalPatient | null {
  const raw = localStorage.getItem(PATIENT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PortalPatient
  } catch {
    return null
  }
}

export function setPortalSession(token: string, patient: PortalPatient) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(PATIENT_KEY, JSON.stringify(patient))
}

export function updatePortalPatient(patient: PortalPatient) {
  localStorage.setItem(PATIENT_KEY, JSON.stringify(patient))
}

export function clearPortalSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PATIENT_KEY)
}

// Chamadas do portal: mesmo padrao do apiFetch, mas com o token do paciente.
export async function portalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPortalToken()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }
  if (options.body != null) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api/portal${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new PortalError((data as { error?: string }).error || 'Não foi possível concluir', res.status)
  }
  return data as T
}

// Baixa um arquivo protegido (documento do paciente) e abre a janelinha de salvar.
export async function portalDownload(path: string, fileName: string) {
  const token = getPortalToken()
  const res = await fetch(`/api/portal${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new PortalError('Arquivo indisponível', res.status)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
    reader.readAsDataURL(file)
  })
}

/* --------------------------- Calendario (.ics) --------------------------- */

function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Gera e baixa o arquivo de calendario da sessao (Google Agenda / iPhone).
export function downloadIcs(appointment: PortalAppointment, clinicName: string) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Psi Hub//Portal do Paciente//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@psihub`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(appointment.startAt)}`,
    `DTEND:${icsStamp(appointment.endAt)}`,
    'SUMMARY:Sessão de psicoterapia',
    `DESCRIPTION:${clinicName}${appointment.meetLink ? ` - Link: ${appointment.meetLink}` : ''}`,
    `LOCATION:${appointment.modality === 'ONLINE' ? appointment.meetLink || 'Online' : clinicName}`,
    ...(appointment.meetLink ? [`URL:${appointment.meetLink}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete da sessão',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sessao-psihub.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ------------------------------ Impressao ------------------------------- */

// Abre uma janelinha pronta para imprimir (recibos).
export function printText(title: string, body: string) {
  const w = window.open('', '_blank', 'width=760,height=640')
  if (!w) return
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>` +
      '<style>body{margin:0;padding:32px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;line-height:1.6;color:#0b0b12}pre{white-space:pre-wrap}</style>' +
      `</head><body><pre>${safe}</pre></body></html>`,
  )
  w.document.close()
  w.focus()
  w.print()
}

/* ------------------------------- Formatos ------------------------------- */

export const SESSION_STATUS_META: Record<string, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Agendada', tone: 'bg-brand-light text-ink' },
  CONFIRMED: { label: 'Confirmada', tone: 'bg-emerald-200 text-ink' },
  IN_PROGRESS: { label: 'Acontecendo agora', tone: 'bg-sun text-ink' },
  DONE: { label: 'Realizada', tone: 'bg-emerald-200 text-ink' },
  CANCELED: { label: 'Cancelada', tone: 'bg-slate-200 text-ink' },
  NO_SHOW: { label: 'Falta', tone: 'bg-pop text-white' },
}

export const MATERIAL_ICON: Record<string, string> = {
  ARTICLE: '📄',
  VIDEO: '🎬',
  AUDIO: '🎧',
  LINK: '🔗',
}

export const DOCUMENT_LABEL: Record<string, string> = {
  CERTIFICATE: 'Atestado',
  RECEIPT: 'Recibo',
  REPORT: 'Relatório',
  OTHER: 'Documento',
}

// "Hoje as 14:00", "Amanha as 09:30", "Seg, 20/10 as 16:00".
export function friendlyWhen(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (diff === 0) return `Hoje as ${time}`
  if (diff === 1) return `Amanhã as ${time}`
  if (diff === -1) return `Ontem as ${time}`
  if (diff > 1 && diff < 7) {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} as ${time}`
  }
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} as ${time}`
}

export function isUpcoming(a: PortalAppointment): boolean {
  return ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status) && new Date(a.endAt).getTime() >= Date.now()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import type { Appointment } from '../types'
import { formatTime } from './format'

// Formata uma duracao em ms como "12 min" / "1h 05min".
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}min`
}

// Tempo decorrido desde o inicio da sessao (ou entre inicio e fim).
export function sessionElapsed(a: Appointment, now: Date = new Date()): string | null {
  if (!a.sessionStartedAt) return null
  const start = new Date(a.sessionStartedAt).getTime()
  const end = a.sessionEndedAt ? new Date(a.sessionEndedAt).getTime() : now.getTime()
  return formatDuration(end - start)
}

// "as 15:00" / "em 25 min" / "agora"
export function relativeToStart(startAt: string, now: Date = new Date()): { label: string; minutes: number } {
  const diff = Math.round((new Date(startAt).getTime() - now.getTime()) / 60_000)
  if (diff < -1) return { label: `${formatDuration(-diff * 60_000)} atrás`, minutes: diff }
  if (diff <= 1) return { label: 'agora', minutes: diff }
  if (diff < 60) return { label: `em ${diff} min`, minutes: diff }
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return { label: m === 0 ? `em ${h}h` : `em ${h}h ${String(m).padStart(2, '0')}min`, minutes: diff }
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// Mensagem padrao enviada ao paciente com o link da sessao.
export function meetMessage(a: Appointment, clinicName: string): string {
  const nome = a.patient?.name?.split(' ')[0] || 'ola'
  const quando = `${new Date(a.startAt).toLocaleDateString('pt-BR')} as ${formatTime(a.startAt)}`
  return `Oi, ${nome}! Sua sessão (${quando}) esta confirmada. Entre pelo link: ${a.meetLink}\n\n${clinicName}`
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const digits = phone ? onlyDigits(phone) : ''
  if (!digits) return null
  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string): string | null {
  if (!email) return null
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

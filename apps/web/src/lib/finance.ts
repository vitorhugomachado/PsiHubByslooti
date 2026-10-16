import type { Payment, PaymentMethod, PaymentStatus } from '../types'
import { formatDate } from './format'
import { whatsappLink } from './session'

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; chip: string; dot: string }> = {
  PENDING: { label: 'Pendente', chip: 'bg-brand-light', dot: 'bg-brand' },
  PAID: { label: 'Pago', chip: 'bg-emerald-200', dot: 'bg-emerald-500' },
  OVERDUE: { label: 'Vencido', chip: 'bg-pop text-white', dot: 'bg-pop' },
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  TRANSFER: 'Transferência',
}

export const METHOD_ORDER: PaymentMethod[] = ['PIX', 'CARD', 'TRANSFER', 'CASH']

export function isOverdue(p: Payment): boolean {
  return p.status !== 'PAID' && new Date(p.dueDate).getTime() < Date.now()
}

// Dias (positivos = a vencer, negativos = atrasado).
export function daysUntilDue(p: Payment): number {
  const due = new Date(p.dueDate)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export function dueLabel(p: Payment): string {
  if (p.status === 'PAID') return `pago em ${formatDate(p.paidAt)}`
  const d = daysUntilDue(p)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d > 1) return `em ${d} dias`
  return `${Math.abs(d)} dia(s) em atraso`
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "R$ 1,2 mil" para caber nos graficos.
export function compactBRL(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

// Mensagem de cobranca amigavel para enviar ao paciente.
export function dunningMessage(p: Payment, clinicName: string): string {
  const nome = p.patient?.name?.split(' ')[0] || 'ola'
  const venc = formatDate(p.dueDate)
  const valor = formatMoney(p.amount)
  const atraso = daysUntilDue(p) < 0
  const intro = atraso
    ? `Oi, ${nome}! Passando para lembrar que a sua sessão no valor de ${valor} estava prevista para ${venc}.`
    : `Oi, ${nome}! Tudo bem? Passando para lembrar do pagamento de ${valor} com vencimento em ${venc}.`
  return `${intro}\n\nQualquer dúvida estou a disposicao. Obrigado(a)!\n\n${clinicName}`
}

export function dunningWhatsApp(p: Payment, clinicName: string): string | null {
  return whatsappLink(p.patient?.phone, dunningMessage(p, clinicName))
}

// Texto do recibo (para copiar ou imprimir).
export function receiptText(p: Payment, clinicName: string): string {
  const lines = [
    'RECIBO DE PAGAMENTO',
    `Clínica: ${clinicName}`,
    `Paciente: ${p.patient?.name || '-'}`,
    `Valor: ${formatMoney(p.amount)}`,
    `Referente a: ${p.description || 'Atendimento psicológico'}`,
    p.method ? `Forma de pagamento: ${METHOD_LABEL[p.method]}` : '',
    `Data: ${formatDate(p.paidAt || p.dueDate)}`,
    '',
    'Declaro ter recebido o valor acima referente aos serviços prestados.',
  ]
  return lines.filter(Boolean).join('\n')
}

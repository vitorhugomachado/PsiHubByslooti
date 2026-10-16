import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Mascot } from './Mascot'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'sun' | 'ink'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white',
  secondary: 'bg-white text-ink',
  danger: 'bg-pop text-white',
  sun: 'bg-sun text-ink',
  ink: 'bg-ink text-white',
  ghost: 'bg-transparent text-ink border-transparent shadow-none hover:bg-ink/10',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const isGhost = variant === 'ghost'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-round text-sm font-bold uppercase tracking-wide disabled:pointer-events-none disabled:opacity-50 ${
        isGhost ? 'border-transparent shadow-none hover:bg-ink/10' : 'sticker sticker-press'
      } ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sticker rounded-3xl bg-white ${className}`}>{children}</div>
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block font-round text-sm font-bold text-ink">{children}</label>
}

const fieldClass =
  'w-full rounded-xl border border-ink bg-white px-3 py-2.5 font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-brand/35'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className || ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className || ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} ${props.className || ''}`} />
}

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-200 text-ink',
    green: 'bg-emerald-300 text-ink',
    blue: 'bg-brand-light text-ink',
    amber: 'bg-sun text-ink',
    red: 'bg-pop text-white',
    indigo: 'bg-brand text-white',
  }
  return (
    <span className={`inline-flex items-center rounded-full border border-ink px-3 py-0.5 font-round text-xs font-bold ${colors[color] || colors.slate}`}>
      {children}
    </span>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="sticker-lg max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white">
        <div className="flex items-center justify-between border-b border-ink px-5 py-4">
          <h2 className="font-display text-xl uppercase tracking-wide text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-ink bg-white p-1.5 text-ink transition hover:bg-pop hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border border-ink border-t-brand" />
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="sticker flex flex-col items-center justify-center rounded-3xl border-dashed bg-white py-12 text-center">
      <Mascot size={84} className="mb-3 -rotate-3" />
      <p className="font-display text-lg uppercase tracking-wide text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink/60">{description}</p>}
    </div>
  )
}

// Titulo de pagina com estilo cartaz.
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-semibold text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

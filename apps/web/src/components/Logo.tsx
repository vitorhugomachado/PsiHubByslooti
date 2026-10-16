import type { CSSProperties } from 'react'

/* ============================================================================
   Psi Hub — logo
   ----------------------------------------------------------------------------
   Lockup: "psi" (tinta) + brilho azul + chip "hub" (azul) e, opcionalmente,
   a assinatura "by slooti".

   O desenho inteiro e dimensionado em `em`, entao a prop `size` (altura total
   do lockup em px) escala tudo proporcionalmente — do icone de 24px ao hero
   da tela de login.

     <Logo size={40} />
     <Logo size={96} withBy />
   ========================================================================== */

/** Brilho de 4 pontas (o mesmo do logo). */
export function Sparkle({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M12 2c.7 4.6 3.4 7.3 8 8-4.6.7-7.3 3.4-8 8-.7-4.6-3.4-7.3-8-8 4.6-.7 7.3-3.4 8-8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ============================================================================
   Assinatura "by slooti" (marca da casa)
   ----------------------------------------------------------------------------
   Desenhada em texto: minusculas geometricas com o ponto laranja no "i".
   Herda o tamanho da fonte do elemento pai — ajuste com classes de texto.

     <SlootiMark className="text-[10px] text-ink/40" />
     <SlootiMark compact />            // so o "s" com o ponto (para o rail fino)
   ========================================================================== */
export function SlootiMark({
  compact = false,
  className = '',
}: {
  /** Versao monograma ("s" + ponto), para espacos estreitos. */
  compact?: boolean
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label="by slooti"
      title="by slooti"
      className={`inline-flex select-none items-baseline font-sans font-semibold leading-none ${className}`}
    >
      {!compact && <span className="mr-[0.34em] opacity-60">by</span>}
      <span className="font-extrabold tracking-[-0.02em]">
        {compact ? 's' : 'sloot'}
        <span className="relative">
          ı
          {/* ponto laranja no lugar do pingo do "i" */}
          <span className="absolute bottom-[0.96em] left-1/2 h-[0.24em] w-[0.24em] -translate-x-1/2 rounded-full bg-slooti" />
        </span>
      </span>
    </span>
  )
}

export function Logo({
  size = 40,
  withBy = false,
  className = '',
}: {
  /** Altura total do lockup, em px. */
  size?: number
  /** Mostra a assinatura "by slooti" abaixo. */
  withBy?: boolean
  className?: string
}) {
  return (
    <div
      className={`inline-flex select-none flex-col items-start ${className}`}
      style={{ fontSize: size * 0.49 }}
      role="img"
      aria-label="Psi Hub"
    >
      {/* psi + brilho */}
      <div className="relative pr-[0.76em] pt-[0.1em]">
        <span className="block font-round font-extrabold leading-[1.02] tracking-[-0.055em] text-ink">psi</span>
        <Sparkle className="absolute right-[0.02em] top-0 h-[0.84em] w-[0.74em] rotate-[8deg] text-hub" />
      </div>

      {/* chip "hub" + assinatura */}
      <div className="inline-flex flex-col items-center">
        <div className="-mt-[0.12em] origin-left -rotate-[4deg] rounded-[0.3em] bg-hub pb-[0.06em] pl-[0.26em] pr-[0.36em] pt-[0.1em] shadow-[0.06em_0.06em_0_rgba(11,11,18,0.18)]">
          <span className="block font-round font-extrabold leading-[0.94] tracking-[-0.03em] text-white">hub</span>
        </div>

        {withBy && <SlootiMark className="mt-[0.16em] text-[0.24em] text-ink" />}
      </div>
    </div>
  )
}

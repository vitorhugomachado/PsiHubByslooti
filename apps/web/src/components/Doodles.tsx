// Doodles decorativos no estilo "sticker" (contorno grosso, cores vivas).

export function DoodleHeart({ className = '', size = 28, color = '#ff4d6d' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill={color} stroke="#0b0b12" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" />
    </svg>
  )
}

export function DoodleSparkle({ className = '', size = 24, color = '#ffd43b' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill={color} stroke="#0b0b12" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 2l2.4 6.2L20.6 10l-6.2 2.4L12 18.6l-2.4-6.2L3.4 10l6.2-1.8z" />
    </svg>
  )
}

export function DoodleStar({ className = '', size = 22, color = '#2e7bf6' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill={color} stroke="#0b0b12" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9z" />
    </svg>
  )
}

export function DoodleBubble({ className = '', size = 34, color = '#ffffff' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} fill={color} stroke="#0b0b12" strokeWidth="2.4" strokeLinejoin="round">
      <path d="M6 6h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14l-6 5v-5H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  )
}

export function DoodleSquiggle({ className = '', size = 60, color = '#0b0b12' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size / 3} viewBox="0 0 60 20" className={className} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
      <path d="M2 12 C8 2 14 2 20 12 S32 22 38 12 S50 2 58 12" />
    </svg>
  )
}

export function DoodleSmiley({ className = '', size = 30, color = '#ffffff' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} fill={color} stroke="#0b0b12" strokeWidth="2.4">
      <circle cx="16" cy="16" r="13" />
      <circle cx="11.5" cy="13" r="2" fill="#0b0b12" stroke="none" />
      <circle cx="20.5" cy="13" r="2" fill="#0b0b12" stroke="none" />
      <path d="M10 19 Q16 25 22 19" fill="none" strokeLinecap="round" />
    </svg>
  )
}

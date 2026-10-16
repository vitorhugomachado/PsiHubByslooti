/* ============================================================================
   Mascote do Psi Hub
   ----------------------------------------------------------------------------
   Os desenhos vem da folha de adesivos oficial, recortada em
   `public/mascot/*.png` (fundo transparente). O componente so escolhe a pose:

     <Mascot />                      // de pe, sorrindo (padrao)
     <Mascot pose="hero" />          // o mascote grande no blob azul (hero)
     <Mascot pose="clipboard" />     // com a prancheta na mao
     <Mascot pose="heart" />         // abracando um coracao
     <Mascot pose="flex" />          // comemorando
     ...

   `size` define a caixa quadrada (o desenho se ajusta dentro, sem distorcer).
   ========================================================================== */

export type MascotPose =
  | 'wave'
  | 'hero'
  | 'clipboard'
  | 'laptop'
  | 'idea'
  | 'heart'
  | 'point'
  | 'calendar'
  | 'flex'
  | 'peek'
  | 'think'
  | 'search'
  | 'chill'

const SRC: Record<MascotPose, string> = {
  wave: '/mascot/wave.png',
  hero: '/mascot/hero.png',
  clipboard: '/mascot/clipboard.png',
  laptop: '/mascot/laptop.png',
  idea: '/mascot/idea.png',
  heart: '/mascot/heart.png',
  point: '/mascot/point.png',
  calendar: '/mascot/calendar.png',
  flex: '/mascot/flex.png',
  peek: '/mascot/peek.png',
  think: '/mascot/think.png',
  search: '/mascot/search.png',
  chill: '/mascot/chill.png',
}

/** Todas as poses disponiveis (mesma ordem da folha de adesivos). */
export const MASCOT_POSES = Object.keys(SRC) as MascotPose[]

export function Mascot({
  pose = 'wave',
  size = 120,
  className = '',
}: {
  pose?: MascotPose
  /** Altura/largura da caixa, em px. */
  size?: number
  className?: string
}) {
  return (
    <img
      src={SRC[pose]}
      alt="Mascote do Psi Hub"
      width={size}
      height={size}
      draggable={false}
      className={`select-none ${className}`}
      style={{ objectFit: 'contain' }}
    />
  )
}

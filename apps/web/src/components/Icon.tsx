import type { CSSProperties, ReactNode, SVGProps } from 'react'

/* ============================================================================
   Psi Hub · Design System — Icones
   ----------------------------------------------------------------------------
   Fonte unica de verdade: o mapa GLYPHS abaixo e consumido pelo componente
   <Icon name="..." /> e pela pagina /design-system (ICON_CATALOG).

   Como funciona o "acento" colorido:
   - O contorno usa sempre `currentColor` (funciona em qualquer fundo/cor de texto).
   - As partes coloridas usam a variavel CSS --icon-accent, definida pela prop
     `accent`. Sem accent, o icone fica monocromatico (so contorno).
   ========================================================================== */

const ACCENT_FILL: CSSProperties = { fill: 'var(--icon-accent, transparent)', stroke: 'none' }
const ACCENT_STROKE: CSSProperties = { stroke: 'var(--icon-accent, currentColor)', fill: 'none' }

type PathProps = SVGProps<SVGPathElement>
type CircleProps = SVGProps<SVGCircleElement>
type RectProps = SVGProps<SVGRectElement>

// Forma preenchida com a cor de destaque.
const Acc = (props: PathProps) => <path style={ACCENT_FILL} {...props} />
const AccCircle = (props: CircleProps) => <circle style={ACCENT_FILL} {...props} />
const AccRect = (props: RectProps) => <rect style={ACCENT_FILL} {...props} />
const AccRing = (props: CircleProps) => <circle style={ACCENT_STROKE} {...props} />

/* ---------- Formas base reaproveitadas ---------- */

const CAL_PATH = 'M5 4.5h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z'
const CAL_BAND = 'M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V10H3z'

// Calendario. `band` pinta a barra superior com o accent.
function Cal({ band = false, children }: { band?: boolean; children?: ReactNode }) {
  return (
    <>
      {band && <Acc d={CAL_BAND} />}
      <path d={CAL_PATH} />
      <path d="M3 10h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      {children}
    </>
  )
}

const FOLDER_PATH = 'M4 5h5l2 2.5h9a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z'
const FOLDER_TAB = 'M4 5h5l2 2.5H4z'

function Folder({ children, accentTab = true }: { children?: ReactNode; accentTab?: boolean }) {
  return (
    <>
      {accentTab && <Acc d={FOLDER_TAB} />}
      <path d={FOLDER_PATH} />
      {children}
    </>
  )
}

const FILE_PATH = 'M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z'
const FILE_FOLD = 'M13.5 3v5.5H19'

function Doc({ children }: { children?: ReactNode }) {
  return (
    <>
      <path d={FILE_PATH} />
      <path d={FILE_FOLD} />
      {children}
    </>
  )
}

// Prancheta/prontuario com o clip no topo.
function Clip({ children }: { children?: ReactNode }) {
  return (
    <>
      <Acc d="M8.5 2.5h7v3h-7z" />
      <path d="M15.5 4.2H17a1.5 1.5 0 0 1 1.5 1.5v13.8a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V5.7A1.5 1.5 0 0 1 7 4.2h1.5" />
      <rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" />
      {children}
    </>
  )
}

const HEART_PATH = 'M12 19.2c-1.8-1.2-5.2-3.7-5.2-7.2a2.9 2.9 0 0 1 5.2-1.8 2.9 2.9 0 0 1 5.2 1.8c0 3.5-3.4 6-5.2 7.2z'
const STAR_PATH = 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z'
const CLOCK_HANDS = 'M12 7.5V12l3 1.8'
const PERSON_HEAD = <circle cx="9" cy="8" r="3.2" />
const PERSON_BODY = 'M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8A4.6 4.6 0 0 1 15 18.6V20'
const REFRESH = 'M20 11a8 8 0 0 0-13.7-5.6L4 7.5M4 13a8 8 0 0 0 13.7 5.6L20 16.5M4 4v3.5h3.5M20 20v-3.5h-3.5'

/* ============================================================================
   Glifos
   ========================================================================== */

const GLYPHS = {
  /* ---------------- Navegacao ---------------- */
  home: (
    <>
      <Acc d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  calendarHeart: (
    <Cal>
      <Acc d={HEART_PATH} />
      <path d={HEART_PATH} />
    </Cal>
  ),
  users: (
    <>
      <AccCircle cx="9" cy="8" r="3.2" />
      {PERSON_HEAD}
      <path d={PERSON_BODY} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.2A4.6 4.6 0 0 1 21 18.6V20" />
    </>
  ),
  folder: <Folder />,
  chartBars: (
    <>
      <AccRect x="4.5" y="12" width="3.3" height="6.5" rx="1.2" />
      <AccRect x="10.3" y="8.5" width="3.3" height="10" rx="1.2" />
      <AccRect x="16.1" y="4.5" width="3.3" height="14" rx="1.2" />
      <rect x="4.5" y="12" width="3.3" height="6.5" rx="1.2" />
      <rect x="10.3" y="8.5" width="3.3" height="10" rx="1.2" />
      <rect x="16.1" y="4.5" width="3.3" height="14" rx="1.2" />
      <path d="M3 19.5h18" />
    </>
  ),
  wallet: (
    <>
      <Acc d="M3 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V9H3z" />
      <path d="M3 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M18 10.5h2.2a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H18a2.5 2.5 0 0 1 0-5z" />
    </>
  ),
  target: (
    <>
      <AccCircle cx="12" cy="12" r="2.6" />
      <AccRing cx="12" cy="12" r="6.2" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  settings: (
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  ),

  /* ---------------- Usuario e perfil ---------------- */
  user: (
    <>
      <AccCircle cx="12" cy="8" r="4" />
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21v-1.5A5.5 5.5 0 0 1 10 14h4a5.5 5.5 0 0 1 5.5 5.5V21" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  shield: (
    <>
      <Acc d="M12 3.2 19 6v6c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6z" />
      <path d="M12 3.2 19 6v6c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6z" />
    </>
  ),
  bell: (
    <>
      <Acc d="M12 3a6 6 0 0 1 6 6c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9a6 6 0 0 1 6-6z" />
      <path d="M12 3a6 6 0 0 1 6 6c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9a6 6 0 0 1 6-6z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  heart: (
    <>
      <Acc d={HEART_PATH} />
      <path d={HEART_PATH} />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),

  /* ---------------- Acoes principais ---------------- */
  plus: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6.5h17M9 6.5V4h6v2.5M18.5 6.5 17.5 20h-11L5.5 6.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  eye: (
    <>
      <AccCircle cx="12" cy="12" r="3" />
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  share: (
    <>
      <AccRing cx="6" cy="12" r="2.8" />
      <AccRing cx="18" cy="6" r="2.8" />
      <AccRing cx="18" cy="18" r="2.8" />
      <circle cx="6" cy="12" r="2.8" />
      <circle cx="18" cy="6" r="2.8" />
      <circle cx="18" cy="18" r="2.8" />
      <path d="M8.5 10.7 15.5 7.3M8.5 13.3l7 3.4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2" />
    </>
  ),
  duplicate: (
    <>
      <AccRect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
      <rect x="3.5" y="8.5" width="12" height="12" rx="2.5" />
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </>
  ),
  xCircle: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  checkCircle: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.7 2.7L16.2 9.6" />
    </>
  ),
  more: (
    <>
      <AccCircle cx="5.5" cy="12" r="1.6" />
      <AccCircle cx="12" cy="12" r="1.6" />
      <AccCircle cx="18.5" cy="12" r="1.6" />
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </>
  ),

  /* ---------------- Comunicacao ---------------- */
  message: (
    <>
      <Acc d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5 4z" />
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5 4z" />
      <path d="M8 10.5h8M8 13.5h5" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 20.5l1.4-4.2A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M12 15.4c-1-.7-2.6-1.9-2.6-3.5a1.5 1.5 0 0 1 2.6-1 1.5 1.5 0 0 1 2.6 1c0 1.6-1.6 2.8-2.6 3.5z" />
    </>
  ),
  video: (
    <>
      <Acc d="M3.5 7.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
      <path d="M3.5 7.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
      <path d="M15.5 10.5 20.5 7v10l-5-3.5z" />
    </>
  ),
  phone: <path d="M21 16.9v2.6a1.5 1.5 0 0 1-1.6 1.5 17 17 0 0 1-7.4-2.6 16.7 16.7 0 0 1-5.1-5.1A17 17 0 0 1 4.3 5.9 1.5 1.5 0 0 1 5.8 4.3h2.6a1.5 1.5 0 0 1 1.5 1.3c.1 1 .4 1.9.7 2.7a1.5 1.5 0 0 1-.3 1.6l-1.1 1.1a13.4 13.4 0 0 0 5.1 5.1l1.1-1.1a1.5 1.5 0 0 1 1.6-.3c.8.3 1.7.6 2.7.7a1.5 1.5 0 0 1 1.3 1.5z" />,
  send: <path d="M21.5 2.5 2.5 9.8l7.4 2.8 2.8 7.4z" />,
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 20.5 11.7z" />
      <path d="M9 9.2c0 3 2.3 5.3 5.3 5.3.6 0 1.2-.5 1.2-1l-.9-.8-1 .6c-1-.4-1.9-1.3-2.3-2.3l.6-1-.8-.9c-.6 0-1.1.6-1.1 1.1z" />
    </>
  ),
  mail: (
    <>
      <Acc d="M3 6.5h18v11H3z" />
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="m4 8 8 5.5L20 8" />
    </>
  ),

  /* ---------------- Pacientes ---------------- */
  patient: (
    <>
      <AccCircle cx="9.5" cy="7.5" r="3.4" />
      <circle cx="9.5" cy="7.5" r="3.4" />
      <path d="M3 20.5v-1.5A4.5 4.5 0 0 1 7.5 14.5h4A4.5 4.5 0 0 1 16 19v1.5" />
      <path d="M18 14.5a3 3 0 0 0-3.5-2.9c1.2.9 1.8 2.2 1.8 3.9 0 1.4-.4 2.6-1.1 3.6" />
    </>
  ),
  patientList: (
    <>
      <AccCircle cx="8.5" cy="8" r="3.2" />
      {PERSON_HEAD}
      <path d={PERSON_BODY} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.2A4.6 4.6 0 0 1 21 18.6V20" />
    </>
  ),
  record: (
    <Clip>
      <path d="M9 11.5h6M9 14.5h6M9 17.5h3.5" />
    </Clip>
  ),
  clipboardCheck: (
    <Clip>
      <path d="M9.2 13.4l2.2 2.2 4-4.4" />
    </Clip>
  ),
  plan: (
    <>
      <AccCircle cx="12" cy="5.5" r="2.4" />
      <circle cx="12" cy="5.5" r="2.4" />
      <circle cx="5.5" cy="18.5" r="2.4" />
      <circle cx="18.5" cy="18.5" r="2.4" />
      <path d="M12 7.9v4.6M12 12.5 5.5 16.1M12 12.5l6.5 3.6" />
    </>
  ),
  evolution: (
    <>
      <path d={HEART_PATH} />
      <path d="M7 12.5h2.5l1.5-3 2 5 1.5-2H17" />
    </>
  ),
  documents: (
    <>
      <Acc d="M14.5 3.5H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14.5 3.5H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14.5 3.5V8H19" />
      <path d="M9 12h6M9 15h6M9 18h3.5" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.2" />
      <path d="M3.5 4.5v3.9h3.9" />
      <path d={CLOCK_HANDS} />
    </>
  ),
  notes: (
    <>
      <path d={FILE_PATH} />
      <path d={FILE_FOLD} />
      <path d="M8.5 11.5h7M8.5 14.5h4" />
      <path d="M11 19.5 15.5 15l2.2 2.2-4.5 4.5-2.7.8z" />
    </>
  ),

  /* ---------------- Agenda ---------------- */
  calendar: <Cal />,
  calendarPlus: (
    <Cal>
      <path d="M12 12.5v5M9.5 15h5" />
    </Cal>
  ),
  calendarCheck: (
    <Cal band>
      <path d="M8.7 15.4l2.4 2.4 4.4-4.6" />
    </Cal>
  ),
  calendarSync: (
    <Cal>
      <path d="M9.3 14.2a3 3 0 0 1 5.1-1M14.7 17.8a3 3 0 0 1-5.1 1" />
      <path d="M14.6 12.4v1.6h-1.6M9.4 19.6v-1.6h1.6" />
    </Cal>
  ),
  calendarX: (
    <Cal>
      <path d="M10 13.5l4.5 4.5M14.5 13.5 10 18" />
    </Cal>
  ),
  calendarClock: (
    <Cal>
      <AccRing cx="12" cy="15.5" r="3.6" strokeWidth="2.4" />
      <circle cx="12" cy="15.5" r="3.6" />
      <path d="M12 13.6v2l1.5.9" />
    </Cal>
  ),
  calendarDone: (
    <Cal band>
      <AccCircle cx="12" cy="15.5" r="3.6" />
      <circle cx="12" cy="15.5" r="3.6" />
      <path d="M10.5 15.5l1.1 1.1 2-2.1" />
    </Cal>
  ),

  /* ---------------- Financeiro ---------------- */
  income: (
    <>
      <AccRect x="4" y="13" width="3.2" height="5.5" rx="1.1" />
      <AccRect x="9.6" y="9.5" width="3.2" height="9" rx="1.1" />
      <AccRect x="15.2" y="6" width="3.2" height="12.5" rx="1.1" />
      <rect x="4" y="13" width="3.2" height="5.5" rx="1.1" />
      <rect x="9.6" y="9.5" width="3.2" height="9" rx="1.1" />
      <rect x="15.2" y="6" width="3.2" height="12.5" rx="1.1" />
      <path d="M3 19h18" />
    </>
  ),
  expenses: (
    <>
      <AccRect x="4" y="6" width="3.2" height="12.5" rx="1.1" />
      <AccRect x="9.6" y="10" width="3.2" height="8.5" rx="1.1" />
      <AccRect x="15.2" y="13.5" width="3.2" height="5" rx="1.1" />
      <rect x="4" y="6" width="3.2" height="12.5" rx="1.1" />
      <rect x="9.6" y="10" width="3.2" height="8.5" rx="1.1" />
      <rect x="15.2" y="13.5" width="3.2" height="5" rx="1.1" />
      <path d="M3 19h18" />
    </>
  ),
  payments: (
    <>
      <Acc d="M2.5 7a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v2.5h-19z" />
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6.5 14.5h4" />
    </>
  ),
  billing: (
    <>
      <Acc d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z" />
      <path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
    </>
  ),
  invoice: (
    <>
      <path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
    </>
  ),
  reportPie: (
    <>
      <Acc d="M12 12V3a9 9 0 0 1 9 9z" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9" />
    </>
  ),
  financeTarget: (
    <>
      <AccCircle cx="13.5" cy="10.5" r="2.4" />
      <AccRing cx="13.5" cy="10.5" r="6" strokeWidth="2.2" />
      <circle cx="13.5" cy="10.5" r="6" />
      <path d="M13.5 10.5 4.5 19.5" />
      <path d="M4.5 14.5v5h5" />
    </>
  ),
  accounts: (
    <>
      <Acc d="M12 2.5 21 7H3z" />
      <path d="M12 2.5 21 7H3z" />
      <path d="M4.5 7v11M9 7v11M15 7v11M19.5 7v11M3 18h18M2.5 21h19" />
    </>
  ),

  /* ---------------- Conteudos ---------------- */
  library: (
    <Folder>
      <AccRing cx="15.5" cy="15" r="2.6" strokeWidth="2.2" />
      <path d="M15.5 12.4v2.6l1.7 1" />
    </Folder>
  ),
  article: (
    <Doc>
      <path d="M8.5 11.5h7M8.5 14.5h7M8.5 17.5h4" />
    </Doc>
  ),
  videoPlay: (
    <>
      <AccRect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M10.2 9.5 15 12l-4.8 2.5z" />
    </>
  ),
  headphones: (
    <>
      <Acc d="M4 15v-3a8 8 0 0 1 16 0v3z" />
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <path d="M8 14h-2.5a1.5 1.5 0 0 0-1.5 1.5v2A1.5 1.5 0 0 0 5.5 19H8zM16 14h2.5a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5H16z" />
    </>
  ),
  course: (
    <>
      <Acc d="M12 4.5 22 9l-10 4.5L2 9z" />
      <path d="M12 4.5 22 9l-10 4.5L2 9z" />
      <path d="M6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </>
  ),
  bookmark: (
    <>
      <Acc d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z" />
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z" />
    </>
  ),
  star: (
    <>
      <Acc d={STAR_PATH} />
      <path d={STAR_PATH} />
    </>
  ),

  /* ---------------- Planejamento ---------------- */
  tasks: (
    <Clip>
      <path d="M8.8 11.5l1.3 1.3 2.3-2.7M8.8 16.5l1.3 1.3 2.3-2.7" />
    </Clip>
  ),
  progress: (
    <>
      <Acc d="M3 17.5 9 11l4 4 8-8.5v6z" />
      <path d="M3 20.5h18" />
      <path d="M3 17.5 9 11l4 4 8-8.5" />
      <path d="M21 3v5" />
    </>
  ),
  flag: (
    <>
      <Acc d="M6 3.5h11l-2 4 2 4H6z" />
      <path d="M6 3.5h11l-2 4 2 4H6z" />
      <path d="M6 3.5V21" />
    </>
  ),
  trophy: (
    <>
      <Acc d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10M16 5.5h2.5A2.5 2.5 0 0 1 16 10" />
      <path d="M12 13v4M8.5 20.5h7M10 17h4" />
    </>
  ),
  idea: (
    <>
      <Acc d="M12 3a5.5 5.5 0 0 1 3.3 9.9c-.4.3-.6.8-.6 1.3v.8H9.3v-.8c0-.5-.2-1-.6-1.3A5.5 5.5 0 0 1 12 3z" />
      <path d="M12 3a5.5 5.5 0 0 1 3.3 9.9c-.4.3-.6.8-.6 1.3v.8H9.3v-.8c0-.5-.2-1-.6-1.3A5.5 5.5 0 0 1 12 3z" />
      <path d="M9.5 18h5M10.5 21h3" />
    </>
  ),
  steps: (
    <>
      <Acc d="M3 20v-4h5v-4h5V8h5V4h3v16z" />
      <path d="M3 20v-4h5v-4h5V8h5V4h3v16z" />
    </>
  ),
  results: (
    <>
      <AccCircle cx="12" cy="9.5" r="5.5" />
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="M9 14.2 7.5 21l4.5-2.4L16.5 21 15 14.2" />
      <path d="M12 6.8l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" />
    </>
  ),
  wellness: (
    <>
      <Acc d="M12 13c0-4 2.5-7.5 7-8 0 4.5-2.5 8-7 8z" />
      <path d="M12 13c0-4 2.5-7.5 7-8 0 4.5-2.5 8-7 8z" />
      <path d="M12 13C12 9 9.5 5.5 5 5c0 4.5 2.5 8 7 8z" />
      <path d="M12 13v8M8.5 21h7" />
    </>
  ),

  /* ---------------- Status / etiquetas ---------------- */
  clock: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d={CLOCK_HANDS} />
    </>
  ),
  dots: (
    <>
      <AccRect x="3" y="3" width="18" height="18" rx="5" />
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="16" cy="12" r="1.5" />
    </>
  ),
  alert: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v6M12 16.5h.01" />
    </>
  ),
  priority: (
    <>
      <Acc d={STAR_PATH} />
      <path d={STAR_PATH} />
    </>
  ),

  /* ---------------- Arquivos e organizacao ---------------- */
  folderOpen: (
    <>
      <Acc d={FOLDER_TAB} />
      <path d={FOLDER_PATH} />
    </>
  ),
  folderPlus: (
    <Folder>
      <path d="M12 12.5v5M9.5 15h5" />
    </Folder>
  ),
  file: <Doc />,
  image: (
    <Doc>
      <AccCircle cx="10.5" cy="11.5" r="1.6" />
      <circle cx="10.5" cy="11.5" r="1.6" />
      <path d="M8 17.5l3.5-3.5 2.5 2.5 2-2 2 3z" />
    </Doc>
  ),
  videoFile: (
    <Doc>
      <path d="M9.5 11.5 15 14.5l-5.5 3z" />
    </Doc>
  ),
  audio: (
    <>
      <AccCircle cx="7" cy="17.5" r="2.6" />
      <circle cx="7" cy="17.5" r="2.6" />
      <circle cx="17.5" cy="15.5" r="2.6" />
      <path d="M9.6 17.5V7l10.5-2.5v11" />
    </>
  ),
  paperclip: <path d="M20 11.5 12 19.5a5.3 5.3 0 0 1-7.5-7.5l8-8a3.5 3.5 0 0 1 5 5l-8 8a1.8 1.8 0 0 1-2.5-2.5l7-7" />,
  uploadFile: (
    <>
      <path d={FILE_PATH} />
      <path d={FILE_FOLD} />
      <path d="M12 17.5V11M9.5 13.5 12 11l2.5 2.5" />
    </>
  ),
  downloadFile: (
    <>
      <path d={FILE_PATH} />
      <path d={FILE_FOLD} />
      <path d="M12 11v6.5M9.5 15 12 17.5l2.5-2.5" />
    </>
  ),

  /* ---------------- Outros ---------------- */
  search: (
    <>
      <AccCircle cx="11" cy="11" r="6.5" />
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20.5 20.5 16 16" />
    </>
  ),
  filter: (
    <>
      <Acc d="M3 4.5h18l-7 8v7l-4-2v-5z" />
      <path d="M3 4.5h18l-7 8v7l-4-2v-5z" />
    </>
  ),
  sort: <path d="M4 7h13M4 12h9M4 17h5M17.5 13v7M17.5 20l-2.5-2.5M17.5 20l2.5-2.5" />,
  help: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <AccCircle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </>
  ),
  sun: (
    <>
      <AccCircle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </>
  ),
  moon: (
    <>
      <Acc d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
    </>
  ),
  sparkles: (
    <>
      <Acc d="M9 3.5 10.4 8 15 9.5 10.4 11 9 15.5 7.6 11 3 9.5 7.6 8z" />
      <path d="M9 3.5 10.4 8 15 9.5 10.4 11 9 15.5 7.6 11 3 9.5 7.6 8z" />
      <path d="M17.5 14.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
    </>
  ),
  feedback: (
    <>
      <Acc d={HEART_PATH} />
      <path d={HEART_PATH} />
      <path d="M12 7.5v3.2M12 14h.01" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
}

export type IconName = keyof typeof GLYPHS

/* ---------- Componente ---------- */

export function Icon({
  name,
  size = 20,
  accent,
  strokeWidth = 2,
  className = '',
  title,
}: {
  name: IconName
  size?: number
  /** Cor das partes destacadas (ex: 'var(--color-brand)'). Sem isso, o icone fica monocromatico. */
  accent?: string
  strokeWidth?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={accent ? ({ '--icon-accent': accent } as CSSProperties) : undefined}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {GLYPHS[name]}
    </svg>
  )
}

/* ---------- Catalogo (usado em /design-system) ---------- */

export type CatalogGroup = {
  group: string
  /** Cor de destaque usada na folha de referencia. */
  tone: string
  items: { name: IconName; label: string }[]
}

const B = 'var(--color-brand)'
const P = 'var(--color-pop)'
const M = 'var(--color-mint)'
const S = 'var(--color-sun)'
const G = 'var(--color-grape)'

export const ICON_CATALOG: CatalogGroup[] = [
  {
    group: 'Navegacao',
    tone: B,
    items: [
      { name: 'home', label: 'Início' },
      { name: 'calendarHeart', label: 'Agenda' },
      { name: 'users', label: 'Pacientes' },
      { name: 'folder', label: 'Conteúdos' },
      { name: 'chartBars', label: 'Relatórios' },
      { name: 'wallet', label: 'Financeiro' },
      { name: 'target', label: 'Metas' },
      { name: 'settings', label: 'Configurações' },
    ],
  },
  {
    group: 'Usuário e perfil',
    tone: P,
    items: [
      { name: 'user', label: 'Perfil' },
      { name: 'pencil', label: 'Editar' },
      { name: 'shield', label: 'Privacidade' },
      { name: 'bell', label: 'Notificações' },
      { name: 'heart', label: 'Favoritos' },
      { name: 'logout', label: 'Sair' },
    ],
  },
  {
    group: 'Ações principais',
    tone: M,
    items: [
      { name: 'plus', label: 'Adicionar' },
      { name: 'pencil', label: 'Editar' },
      { name: 'trash', label: 'Excluir' },
      { name: 'eye', label: 'Visualizar' },
      { name: 'share', label: 'Compartilhar' },
      { name: 'download', label: 'Download' },
      { name: 'upload', label: 'Enviar' },
      { name: 'duplicate', label: 'Duplicar' },
      { name: 'link', label: 'Copiar link' },
      { name: 'xCircle', label: 'Cancelar' },
      { name: 'checkCircle', label: 'Confirmar' },
      { name: 'more', label: 'Mais' },
    ],
  },
  {
    group: 'Comunicação',
    tone: P,
    items: [
      { name: 'message', label: 'Mensagem' },
      { name: 'chat', label: 'Chat' },
      { name: 'video', label: 'Videoconsulta' },
      { name: 'phone', label: 'Ligar' },
      { name: 'send', label: 'Enviar' },
      { name: 'whatsapp', label: 'WhatsApp' },
      { name: 'mail', label: 'E-mail' },
    ],
  },
  {
    group: 'Pacientes',
    tone: P,
    items: [
      { name: 'patient', label: 'Paciente' },
      { name: 'patientList', label: 'Lista de pacientes' },
      { name: 'record', label: 'Prontuário' },
      { name: 'clipboardCheck', label: 'Avaliação' },
      { name: 'plan', label: 'Plano terapeutico' },
      { name: 'evolution', label: 'Evolução' },
      { name: 'documents', label: 'Documentos' },
      { name: 'history', label: 'Histórico' },
      { name: 'notes', label: 'Anotações' },
    ],
  },
  {
    group: 'Agenda',
    tone: B,
    items: [
      { name: 'calendar', label: 'Agenda' },
      { name: 'calendarPlus', label: 'Novo agendamento' },
      { name: 'calendarCheck', label: 'Agendado' },
      { name: 'calendarSync', label: 'Reagendar' },
      { name: 'calendarX', label: 'Cancelar' },
      { name: 'calendarClock', label: 'Em andamento' },
      { name: 'calendarDone', label: 'Concluído' },
    ],
  },
  {
    group: 'Financeiro',
    tone: M,
    items: [
      { name: 'wallet', label: 'Financeiro' },
      { name: 'income', label: 'Receitas' },
      { name: 'expenses', label: 'Despesas' },
      { name: 'payments', label: 'Pagamentos' },
      { name: 'billing', label: 'Cobrança' },
      { name: 'invoice', label: 'Faturas' },
      { name: 'reportPie', label: 'Relatórios' },
      { name: 'financeTarget', label: 'Metas financeiras' },
      { name: 'accounts', label: 'Contas' },
    ],
  },
  {
    group: 'Conteúdos',
    tone: G,
    items: [
      { name: 'library', label: 'Biblioteca' },
      { name: 'article', label: 'Artigos' },
      { name: 'videoPlay', label: 'Vídeos' },
      { name: 'headphones', label: 'Áudios' },
      { name: 'course', label: 'Cursos' },
      { name: 'bookmark', label: 'Favoritos' },
      { name: 'star', label: 'Recomendações' },
    ],
  },
  {
    group: 'Planejamento',
    tone: M,
    items: [
      { name: 'target', label: 'Metas' },
      { name: 'tasks', label: 'Tarefas' },
      { name: 'progress', label: 'Progresso' },
      { name: 'flag', label: 'Objetivos' },
      { name: 'trophy', label: 'Conquistas' },
      { name: 'idea', label: 'Ideias' },
      { name: 'steps', label: 'Evolução' },
      { name: 'results', label: 'Resultados' },
      { name: 'wellness', label: 'Bem-estar' },
    ],
  },
  {
    group: 'Status / etiquetas',
    tone: P,
    items: [
      { name: 'heart', label: 'Paciente' },
      { name: 'calendarDone', label: 'Agendado' },
      { name: 'checkCircle', label: 'Concluído' },
      { name: 'clock', label: 'Pendente' },
      { name: 'dots', label: 'Em andamento' },
      { name: 'alert', label: 'Importante' },
      { name: 'priority', label: 'Prioritario' },
    ],
  },
  {
    group: 'Arquivos e organizacao',
    tone: B,
    items: [
      { name: 'folder', label: 'Pasta' },
      { name: 'folderPlus', label: 'Nova pasta' },
      { name: 'file', label: 'Arquivo' },
      { name: 'image', label: 'Imagem' },
      { name: 'videoFile', label: 'Vídeo' },
      { name: 'audio', label: 'Áudio' },
      { name: 'paperclip', label: 'Anexo' },
      { name: 'uploadFile', label: 'Upload' },
      { name: 'downloadFile', label: 'Download' },
    ],
  },
  {
    group: 'Outros',
    tone: S,
    items: [
      { name: 'search', label: 'Pesquisar' },
      { name: 'filter', label: 'Filtro' },
      { name: 'sort', label: 'Ordem' },
      { name: 'help', label: 'Ajuda' },
      { name: 'info', label: 'Informações' },
      { name: 'sun', label: 'Modo claro' },
      { name: 'moon', label: 'Modo escuro' },
      { name: 'sparkles', label: 'Tema' },
      { name: 'feedback', label: 'Feedback' },
    ],
  },
]

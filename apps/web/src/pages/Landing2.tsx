import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { Logo } from '../components/Logo'
import { Mascot } from '../components/Mascot'
import { DoodleHeart, DoodleSmiley, DoodleSparkle, DoodleStar } from '../components/Doodles'
import { Icon, type IconName } from '../components/Icon'
import { formatCurrency } from '../lib/format'

/* ============================================================================
   Landing 2 — versao "cartaz de adesivos" (fidelidade maxima a referencia
   slush.app), com a identidade do Psi Hub: mascote, paleta, icones e conteudo.
   ----------------------------------------------------------------------------
   Estrutura copiada da referencia: marquee pastel no topo, nav flutuante com
   pill central e CTA preto, wordmark gigante com adesivos colados nas letras,
   tagline curta em caixa de frase, botoes pill brancos, faixas de cor
   full-bleed e rodape escuro com letreiro display.
   Valores: 7 dias gratis, mensal R$ 59,90 e anual 12x de R$ 39,90.
   ========================================================================== */

/* Valores dos planos — mesma fonte de preco da /landing. */
const PRICE = {
  monthly: 59.9,
  installment: 39.9,
  months: 12,
}
const ANNUAL_TOTAL = PRICE.installment * PRICE.months // R$ 478,80
const MONTHLY_TOTAL = PRICE.monthly * PRICE.months // R$ 718,80
const SAVINGS = Math.round((1 - ANNUAL_TOTAL / MONTHLY_TOTAL) * 100) // 33%

const navSections = [
  { id: 'recursos', label: 'Recursos' },
  { id: 'como-funciona', label: 'Como funciona' },
  { id: 'planos', label: 'Planos' },
  { id: 'duvidas', label: 'Dúvidas' },
]

const trust: { icon: IconName; title: string; text: string }[] = [
  { icon: 'sparkles', title: '7 dias grátis', text: 'sem cartão de crédito' },
  { icon: 'heart', title: 'Sem fidelidade', text: 'cancele quando quiser' },
  { icon: 'shield', title: 'Privacidade e LGPD', text: 'seus dados protegidos' },
  { icon: 'calendarCheck', title: 'De qualquer aparelho', text: 'celular, tablet e desktop' },
]

/* Cada recurso ganha um "tile" de adesivo: fundo, cor do icone e accent. */
const features: { icon: IconName; title: string; text: string; card: string; tile: string; accent: string }[] = [
  {
    icon: 'calendarHeart',
    title: 'Agenda completa',
    text: 'Dia, semana, mês e ano. Remarque sessões arrastando e soltando, do jeito mais fácil.',
    card: 'bg-white',
    tile: 'bg-brand text-white',
    accent: 'var(--color-sun)',
  },
  {
    icon: 'patientList',
    title: 'Pacientes organizados',
    text: 'Cadastro completo, busca rápida, anotações internas e lixeira com restauração.',
    card: 'bg-cream',
    tile: 'bg-sun text-ink',
    accent: 'var(--color-pop)',
  },
  {
    icon: 'wallet',
    title: 'Financeiro no controle',
    text: 'Cobranças do mês em um clique, baixa de pagamento, estorno e recibo pronto pra imprimir.',
    card: 'bg-brand-light',
    tile: 'bg-pop text-white',
    accent: 'var(--color-sun)',
  },
  {
    icon: 'video',
    title: 'Sessões online',
    text: 'Gere o link da videocall em um clique e envie por WhatsApp ou e-mail.',
    card: 'bg-cream',
    tile: 'bg-ink text-white',
    accent: 'var(--color-hub)',
  },
  {
    icon: 'whatsapp',
    title: 'Tudo pelo WhatsApp',
    text: 'Confirme sessões e cobre pacientes sem sair do sistema.',
    card: 'bg-white',
    tile: 'bg-hub text-white',
    accent: 'var(--color-ink)',
  },
  {
    icon: 'patient',
    title: 'Portal do paciente',
    text: 'Seus pacientes acompanham sessões, documentos e pagamentos pelo celular.',
    card: 'bg-brand-light',
    tile: 'bg-brand-light text-ink',
    accent: 'var(--color-brand)',
  },
]

const steps = [
  {
    title: 'Crie sua conta',
    text: 'Leva menos de um minuto e você já começa com 7 dias grátis. Sem cartão de crédito.',
    number: 'bg-brand text-white',
  },
  {
    title: 'Chame seus pacientes',
    text: 'Cadastre a turma, defina os valores e monte a agenda da semana.',
    number: 'bg-sun text-ink',
  },
  {
    title: 'Deixe o resto com a gente',
    text: 'Cobranças, links de sessão e relatórios no automático pra você focar nas sessões.',
    number: 'bg-pop text-white',
  },
]

const planFeatures = [
  'Todos os recursos inclusos: agenda, pacientes e financeiro',
  'Sessões online + portal do paciente',
  'Cobranças e confirmações por WhatsApp e e-mail',
  'Relatórios, recibos e exportação de dados',
  'Atualizações constantes + suporte humano',
]

/* Tres perfis de uso (na referencia: "Crypto for humans. Not just degens."). */
const personas: { title: string; text: string; link: string; action: 'cadastro' | 'recursos' | 'planos' }[] = [
  {
    title: 'Pra quem tá começando',
    text: 'Crie a conta, cadastre a turma e monte a agenda em minutos. Sem tutorial, sem enrolação.',
    link: 'Começar grátis',
    action: 'cadastro',
  },
  {
    title: 'Pra quem tem agenda cheia',
    text: 'Cobranças, confirmações e links de sessão no automático pra sobrar tempo pro que importa.',
    link: 'Ver recursos',
    action: 'recursos',
  },
  {
    title: 'Pra quem cuida de muita gente',
    text: 'Relatórios, recibos e portal do paciente inclusos. Sua rotina inteira organizada.',
    link: 'Ver planos',
    action: 'planos',
  },
]

const faqs = [
  {
    q: 'Como funcionam os 7 dias grátis?',
    a: 'Você cria sua conta e usa o Psi Hub completo por 7 dias, sem compromisso. No fim do período, é só escolher um plano se quiser continuar.',
  },
  {
    q: 'Preciso de cartão de crédito pra começar?',
    a: 'Não! O cadastro e o período de teste são feitos sem cartão. Você só informa a forma de pagamento na hora de assinar.',
  },
  {
    q: 'Qual a diferença entre o plano mensal e o anual?',
    a: `Nenhuma nos recursos - mudam só o preço e a forma de pagamento. No mensal você paga ${formatCurrency(
      PRICE.monthly,
    )} por mês; no anual, 12x de ${formatCurrency(PRICE.installment)} (total de ${formatCurrency(
      ANNUAL_TOTAL,
    )}), uma economia de ${SAVINGS}%.`,
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. O plano mensal não tem fidelidade: cancelou, acabou. No anual, o acesso segue até o fim do período já pago e depois é só não renovar.',
  },
  {
    q: 'Meus dados e os dos meus pacientes estão seguros?',
    a: 'Sim. Cada clínica enxerga apenas os próprios dados, a exclusão é reversível (lixeira) e dá pra exportar os dados do paciente quando quiser - tudo pensado pra LGPD.',
  },
]

/* Faixa pastel de anuncios rolando no topo (marquee), estilo letreiro. */
function Marquee() {
  const items = [
    '7 dias grátis',
    'sem cartão de crédito',
    'agenda + prontuário',
    'cobrança no automático',
    'sessões online',
    'portal do paciente',
    'feito pra psi',
  ]
  return (
    <div className="overflow-hidden border-b border-ink bg-sun py-2.5">
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {items.map((item) => (
              <span
                key={`${half}-${item}`}
                className="flex items-center gap-4 whitespace-nowrap px-4 font-display text-xs uppercase tracking-[0.18em] text-ink"
              >
                {item}
                <span className="text-brand">★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* Titulo display gigante, com entrelinha esmagada (estilo cartaz). */
function BandTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`font-display text-5xl uppercase leading-[0.85] text-balance text-ink sm:text-7xl lg:text-8xl ${className}`}
    >
      {children}
    </h2>
  )
}

function PlanFeatureList({ tone = 'ink' }: { tone?: 'ink' | 'white' }) {
  const white = tone === 'white'
  return (
    <ul className="mt-6 flex-1 space-y-2.5">
      {planFeatures.map((item) => (
        <li key={item} className={`flex items-start gap-2 text-sm font-semibold ${white ? 'text-white/90' : 'text-ink/70'}`}>
          <Icon
            name="checkCircle"
            size={18}
            className="mt-0.5 shrink-0"
            accent={white ? 'var(--color-sun)' : 'var(--color-brand)'}
          />
          {item}
        </li>
      ))}
    </ul>
  )
}

/* Duas fileiras de adesivos de icone rolando em direcoes opostas
   (na referencia: a faixa de logos do ecossistema). */
const tickerRowA: IconName[] = [
  'calendarHeart',
  'wallet',
  'video',
  'whatsapp',
  'patient',
  'billing',
  'record',
  'reportPie',
  'invoice',
  'clock',
  'chat',
  'mail',
]
const tickerRowB: IconName[] = [
  'patientList',
  'payments',
  'income',
  'expenses',
  'target',
  'evolution',
  'clipboardCheck',
  'documents',
  'library',
  'sparkles',
  'heart',
  'shield',
]
const tickerTiles = [
  { bg: 'bg-brand text-white', accent: 'var(--color-sun)' },
  { bg: 'bg-sun text-ink', accent: 'var(--color-pop)' },
  { bg: 'bg-white text-ink', accent: 'var(--color-brand)' },
  { bg: 'bg-pop text-white', accent: 'var(--color-sun)' },
  { bg: 'bg-ink text-white', accent: 'var(--color-hub)' },
  { bg: 'bg-brand-light text-ink', accent: 'var(--color-brand)' },
]

function IconTicker() {
  return (
    <section className="overflow-hidden border-y border-ink bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <BandTitle className="mx-auto max-w-3xl">TUDO CONVERSANDO ENTRE SI</BandTitle>
        <p className="mx-auto mt-5 max-w-xl font-round text-lg font-semibold text-ink/65">
          Agenda, financeiro, pacientes e sessões - tudo junto e misturado, sem retrabalho.
        </p>
      </div>

      <div className="mt-10 space-y-5">
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center gap-5 px-2.5">
              {tickerRowA.map((name, i) => {
                const tile = tickerTiles[i % tickerTiles.length]
                return (
                  <span
                    key={`${half}-${name}`}
                    className={`sticker flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tile.bg} ${i % 2 === 0 ? '-rotate-3' : 'rotate-2'}`}
                  >
                    <Icon name={name} size={30} accent={tile.accent} />
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        <div className="marquee-track-reverse">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center gap-5 px-2.5">
              {tickerRowB.map((name, i) => {
                const tile = tickerTiles[(i + 3) % tickerTiles.length]
                return (
                  <span
                    key={`${half}-${name}`}
                    className={`sticker flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tile.bg} ${i % 2 === 0 ? 'rotate-2' : '-rotate-3'}`}
                  >
                    <Icon name={name} size={30} accent={tile.accent} />
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Landing2() {
  const navigate = useNavigate()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function go(action: 'cadastro' | 'recursos' | 'planos') {
    if (action === 'cadastro') navigate('/cadastro')
    else scrollTo(action)
  }

  return (
    <div className="min-h-full bg-white">
      <Marquee />

      <div className="relative">
        {/* ---------- Barra de navegacao (flutuante sobre o hero) ---------- */}
        <header className="absolute inset-x-0 top-0 z-40">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
            <Link
              to="/"
              aria-label="Psi Hub - início"
              className="sticker flex items-center rounded-full bg-white px-3 py-1.5 lg:justify-self-start"
            >
              <Logo size={30} />
            </Link>

            <nav className="sticker hidden items-center gap-0.5 rounded-full bg-white px-1.5 py-1 md:flex lg:justify-self-center">
              {navSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollTo(section.id)
                  }}
                  className="rounded-full px-3 py-1.5 font-round text-sm font-bold text-ink/60 transition hover:bg-cream hover:text-ink"
                >
                  {section.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 lg:justify-self-end">
              <span className="hidden sm:block">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
              </span>
              <Button variant="ink" onClick={() => navigate('/cadastro')}>
                <Icon name="sparkles" size={17} />
                7 dias grátis
              </Button>
            </div>
          </div>
        </header>

        {/* ---------- Hero ---------- */}
        <section className="bg-brand-light px-4 pb-16 pt-24 sm:pt-28">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-ink bg-white px-4 py-1.5 shadow-ink">
            <Icon name="sparkles" size={15} accent="var(--color-brand)" />
            <span className="font-round text-xs font-bold uppercase tracking-wide text-ink sm:text-sm">
              Feito pra psicólogas e psicólogos
            </span>
          </div>

          {/* Wordmark gigante */}
          <div className="relative mx-auto mt-4 max-w-5xl">
            <Mascot pose="idea" size={128} className="absolute -right-10 top-6 z-20 hidden rotate-6 xl:block" />
            <DoodleSparkle className="absolute left-[12%] -top-10 -rotate-12" size={32} />
            <DoodleStar className="absolute right-[14%] -top-8 rotate-12" size={26} color="#ff4d6d" />

            <h1 className="relative z-10 text-center font-display text-[clamp(72px,19vw,280px)] uppercase leading-[0.8] text-ink">
              PSI{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word -rotate-2 bg-sun text-ink">HUB</span>
              </span>
            </h1>
          </div>

          {/* Tagline curta, em caixa de frase (na referencia: "Your money. Unstuck.") */}
          <p className="mt-8 text-center font-round text-3xl font-bold leading-tight text-ink sm:text-5xl">
            Seu consultório. No jeito.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base font-semibold leading-relaxed text-ink/70 sm:text-lg">
            Agenda, pacientes, sessões online e financeiro do seu consultório num só lugar.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" className="px-7 py-3 text-base" onClick={() => navigate('/cadastro')}>
              Começar grátis
              <Icon name="sparkles" size={18} accent="var(--color-brand)" />
            </Button>
            <Button variant="secondary" className="px-7 py-3 text-base" onClick={() => scrollTo('planos')}>
              Ver planos
            </Button>
          </div>

          <p className="mt-4 text-center font-round text-xs font-bold text-ink/50">
            Comece sem cartão de crédito - só escolhe um plano se quiser continuar.
          </p>

          {/* Mascote hero + chips de adesivo */}
          <div className="relative mx-auto mt-10 w-full max-w-3xl">
            <span className="sticker absolute -left-4 top-8 z-20 hidden -rotate-6 items-center gap-2 rounded-2xl bg-sun px-3 py-2 font-round text-sm font-bold text-ink sm:inline-flex">
              <Icon name="calendarCheck" size={18} accent="var(--color-brand)" />
              agenda em dia
            </span>
            <span className="sticker absolute -right-6 top-24 z-20 hidden rotate-3 items-center gap-2 rounded-2xl bg-pop px-3 py-2 font-round text-sm font-bold text-white sm:inline-flex">
              <Icon name="billing" size={18} accent="var(--color-sun)" />
              cobrança no automático
            </span>
            <span className="sticker absolute -left-6 bottom-28 z-20 hidden -rotate-3 items-center gap-2 rounded-2xl bg-white px-3 py-2 font-round text-sm font-bold text-ink sm:inline-flex">
              <Icon name="video" size={18} accent="var(--color-brand)" />
              sessões online
            </span>
            <span className="sticker absolute -right-4 bottom-36 z-20 hidden rotate-6 items-center gap-2 rounded-2xl bg-hub px-3 py-2 font-round text-sm font-bold text-white sm:inline-flex">
              <Icon name="patient" size={18} accent="var(--color-sun)" />
              portal do paciente
            </span>

            <Mascot pose="hero" size={560} className="relative z-10 mx-auto h-auto w-[260px] sm:w-[360px] lg:w-[430px]" />

            <Mascot pose="wave" size={112} className="absolute -left-12 bottom-8 z-0 hidden -rotate-6 lg:block" />
            <Mascot pose="point" size={112} className="absolute -right-12 bottom-12 z-0 hidden rotate-6 lg:block" />
          </div>
        </section>
      </div>

      {/* ---------- Faixa de confianca ---------- */}
      <section className="border-b border-ink bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ink bg-brand-light">
                <Icon name={item.icon} size={21} accent="var(--color-brand)" />
              </span>
              <div>
                <p className="font-round text-sm font-bold leading-tight text-ink">{item.title}</p>
                <p className="text-xs font-semibold text-ink/55">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Recursos ---------- */}
      <section id="recursos" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="relative mx-auto max-w-3xl text-center">
            <DoodleSparkle className="absolute -left-8 top-0 -rotate-12" size={34} />
            <DoodleStar className="absolute -right-6 top-4 rotate-12" size={26} color="#ffd43b" />
            <Mascot pose="idea" size={130} className="absolute -right-24 -top-16 hidden rotate-6 xl:block" />

            <BandTitle>
              TUDO EM UM{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word rotate-1 bg-sun text-ink">SÓ LUGAR</span>
              </span>
            </BandTitle>
            <p className="mx-auto mt-6 max-w-xl font-round text-lg font-semibold text-ink/65">
              Tudo o que o consultório precisa, sem planilha, sem caderninho e sem dez aplicativos diferentes.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <article
                key={feature.title}
                className={`sticker rounded-[28px] p-6 ${feature.card} ${i % 3 === 1 ? 'sm:-rotate-1' : i % 3 === 2 ? 'sm:rotate-1' : ''}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-ink ${feature.tile}`}>
                  <Icon name={feature.icon} size={25} accent={feature.accent} />
                </span>
                <h3 className="mt-4 font-round text-lg font-bold leading-tight text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink/65">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Como funciona ---------- */}
      <section id="como-funciona" className="relative scroll-mt-24 border-y border-ink bg-cream">
        <Mascot pose="peek" size={190} className="absolute -top-[4.5rem] right-10 hidden lg:block" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <BandTitle>
              COMEÇAR É{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word -rotate-1 bg-brand text-white">SIMPLES</span>
              </span>
            </BandTitle>
            <p className="mx-auto mt-6 max-w-xl font-round text-lg font-semibold text-ink/65">
              Em menos de um minuto você tem uma conta pronta pra receber pacientes. Olha só:
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="sticker relative rounded-[28px] bg-white p-6 pt-9">
                <span
                  className={`absolute -top-5 left-6 flex h-11 w-11 items-center justify-center rounded-full border border-ink font-display text-xl ${step.number}`}
                >
                  {i + 1}
                </span>
                <h3 className="font-round text-lg font-bold leading-tight text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink/65">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Mascot pose="clipboard" size={130} className="hidden -rotate-3 sm:block" />
            <p className="max-w-md font-round text-base font-bold leading-snug text-ink/70">
              E se bater qualquer dúvida, a gente responde de gente pra gente. Sem robô, sem fila.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Faixa de icones rolando ---------- */}
      <IconTicker />

      {/* ---------- Feito pra gente (3 perfis) ---------- */}
      <section className="border-b border-ink bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="relative mx-auto max-w-3xl text-center">
            <DoodleHeart className="absolute -left-6 top-0 -rotate-12" size={28} />
            <BandTitle>
              FEITO PRA GENTE.{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word rotate-1 bg-pop text-white">NÃO PRA PLANILHAS</span>
              </span>
              .
            </BandTitle>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {personas.map((persona, i) => (
              <article
                key={persona.title}
                className={`sticker flex flex-col rounded-[24px] bg-white p-6 ${i === 1 ? 'lg:-rotate-1' : i === 2 ? 'lg:rotate-1' : ''}`}
              >
                <h3 className="font-round text-xl font-bold leading-tight text-ink">{persona.title}</h3>
                <p className="mt-2 flex-1 text-sm font-semibold leading-relaxed text-ink/65">{persona.text}</p>
                <button
                  onClick={() => go(persona.action)}
                  className="mt-5 flex w-fit items-center gap-2 font-round text-sm font-bold uppercase tracking-wide text-brand transition hover:text-brand-dark"
                >
                  {persona.link}
                  <span aria-hidden>→</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Planos ---------- */}
      <section id="planos" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="relative mx-auto max-w-3xl text-center">
            <Mascot pose="flex" size={140} className="absolute -left-28 -top-12 hidden rotate-6 xl:block" />
            <DoodleHeart className="absolute -right-4 top-0 rotate-12" size={28} />

            <BandTitle>
              PLANOS QUE CABEM{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word rotate-1 bg-pop text-white">NO BOLSO</span>
              </span>
            </BandTitle>
            <p className="mx-auto mt-6 max-w-xl font-round text-lg font-semibold text-ink/65">
              Comece com 7 dias grátis e escolha depois. Sem fidelidade, sem pegadinha.
            </p>
            <div className="sticker mx-auto mt-6 w-fit -rotate-2 rounded-2xl bg-sun px-4 py-2 font-round text-sm font-bold text-ink">
              7 dias grátis pra testar tudo - sem cartão
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
            {/* Mensal */}
            <div className="sticker flex flex-col rounded-[32px] bg-white p-7">
              <p className="font-round text-sm font-bold uppercase tracking-wide text-ink/50">Mensal</p>
              <p className="mt-3 font-display text-5xl text-ink">
                {formatCurrency(PRICE.monthly)}
                <span className="ml-1 font-round text-base font-bold text-ink/50">/mês</span>
              </p>
              <p className="mt-2 text-sm font-semibold text-ink/60">Sem fidelidade: cancelou, acabou.</p>
              <PlanFeatureList />
              <Button variant="secondary" className="mt-7 w-full py-3 text-base" onClick={() => navigate('/cadastro')}>
                Assinar mensal
              </Button>
            </div>

            {/* Anual */}
            <div className="sticker relative flex flex-col rounded-[32px] bg-brand p-7 text-white">
              <span className="sticker absolute -right-3 -top-4 rotate-6 rounded-2xl bg-sun px-3 py-1.5 font-round text-xs font-bold uppercase text-ink">
                economize {SAVINGS}%
              </span>
              <p className="font-round text-sm font-bold uppercase tracking-wide text-white/70">Anual</p>
              <p className="mt-3 font-display text-5xl">
                12x {formatCurrency(PRICE.installment)}
                <span className="ml-1 font-round text-base font-bold text-white/60">/mês</span>
              </p>
              <p className="mt-2 text-sm font-semibold text-white/75">
                Total de {formatCurrency(ANNUAL_TOTAL)} no ano - o melhor preço por sessão.
              </p>
              <PlanFeatureList tone="white" />
              <Button variant="sun" className="mt-7 w-full py-3 text-base" onClick={() => navigate('/cadastro')}>
                Assinar anual
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Duvidas frequentes ---------- */}
      <section id="duvidas" className="relative scroll-mt-24 border-t border-ink bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="relative mx-auto max-w-3xl text-center">
            <Mascot pose="think" size={140} className="absolute -left-28 -top-10 hidden rotate-3 xl:block" />
            <DoodleSmiley className="absolute -right-2 top-0 rotate-12" size={34} color="#2e7bf6" />

            <BandTitle>
              FICOU COM{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word -rotate-1 bg-brand text-white">DÚVIDA</span>
              </span>
              ?
            </BandTitle>
            <p className="mx-auto mt-6 max-w-xl font-round text-lg font-semibold text-ink/65">
              As perguntas que a gente mais escuta por aqui:
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="sticker group rounded-3xl bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-round text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <Icon
                    name="plus"
                    size={20}
                    className="shrink-0 transition-transform group-open:rotate-45"
                    accent="var(--color-brand)"
                  />
                </summary>
                <p className="px-5 pb-5 text-sm font-semibold leading-relaxed text-ink/65">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Chamada final ---------- */}
      <section className="relative overflow-hidden bg-brand">
        <DoodleSparkle className="absolute left-8 top-8 -rotate-12 opacity-90" size={32} />
        <DoodleStar className="absolute bottom-10 left-1/4 hidden opacity-90 sm:block" size={24} color="#ffd43b" />
        <DoodleSmiley className="absolute right-1/4 top-12 hidden rotate-12 opacity-90 sm:block" size={36} color="#ffd43b" />

        <Mascot pose="flex" size={230} className="absolute -bottom-2 right-4 hidden rotate-3 xl:block" />
        <Mascot pose="heart" size={100} className="absolute bottom-8 right-44 hidden rotate-6 xl:block" />

        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <h2 className="font-display text-5xl uppercase leading-[0.85] text-white sm:text-7xl">
            PRONTO PRA DEIXAR O CONSULTÓRIO{' '}
            <span className="whitespace-nowrap">
              <span className="sticker-word rotate-1 bg-sun text-ink">NO JEITO</span>
            </span>
            ?
          </h2>
          <p className="mx-auto mt-6 max-w-lg font-round text-lg font-semibold text-white/85">
            Crie sua conta e teste tudo por 7 dias - de graça e sem cartão. Se não amar, é só não assinar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="ink" className="px-7 py-3 text-base" onClick={() => navigate('/cadastro')}>
              <Icon name="sparkles" size={18} accent="var(--color-sun)" />
              Começar grátis
            </Button>
            <Button variant="secondary" className="px-7 py-3 text-base" onClick={() => navigate('/login')}>
              Já tenho conta
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Rodape ---------- */}
      <footer className="bg-ink text-white">
        <div className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-14">
            <p className="text-center font-display text-4xl uppercase leading-[0.9] sm:text-6xl">
              COMECE GRÁTIS. DEPOIS A GENTE{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word -rotate-1 bg-sun text-ink">CUIDA DO RESTO</span>
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="sticker inline-flex rounded-2xl bg-white px-3 py-2">
              <Logo size={38} withBy />
            </span>
            <p className="mt-4 max-w-xs text-sm font-semibold text-white/60">
              Gestão de consultório simples, bonita e do seu jeito. Feita pra quem cuida de gente.
            </p>
          </div>

          <div className="flex gap-14">
            <div>
              <p className="font-round text-sm font-bold text-white">Navegue</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-white/60">
                {navSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        scrollTo(section.id)
                      }}
                      className="transition hover:text-sun"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-round text-sm font-bold text-white">Comece agora</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-white/60">
                <li>
                  <button onClick={() => navigate('/cadastro')} className="transition hover:text-sun">
                    Criar conta grátis
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/login')} className="transition hover:text-sun">
                    Entrar
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('planos')} className="transition hover:text-sun">
                    Ver planos
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs font-semibold text-white/50">
            <span>© {new Date().getFullYear()} Psi Hub</span>
            <span>feito com carinho pra quem cuida de gente</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

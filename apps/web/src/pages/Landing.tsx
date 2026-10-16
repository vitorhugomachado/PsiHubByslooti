import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui'
import { Logo } from '../components/Logo'
import { Mascot } from '../components/Mascot'
import { DoodleHeart, DoodleSmiley, DoodleSparkle, DoodleStar } from '../components/Doodles'
import { Icon, type IconName } from '../components/Icon'
import { formatCurrency } from '../lib/format'

/* ============================================================================
   Landing page publica do Psi Hub
   ----------------------------------------------------------------------------
   Vitrine do produto: hero, recursos, como funciona, planos (7 dias gratis,
   mensal R$ 59,90 e anual 12x R$ 39,90), duvidas frequentes e chamada final.
   Usa apenas os componentes e utilitarios do design system (.sticker,
   .sticker-word, Button, Card, Badge, Logo, Mascot, Icon, Doodles).
   ========================================================================== */

/* Valores dos planos â€” fonte unica para a pagina inteira. */
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

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'calendarHeart',
    title: 'Agenda completa',
    text: 'Dia, semana, mês e ano. Remarque sessões arrastando e soltando, do jeito mais facil.',
  },
  {
    icon: 'patientList',
    title: 'Pacientes organizados',
    text: 'Cadastro completo, busca rapida, anotações internas e lixeira com restauracao.',
  },
  {
    icon: 'wallet',
    title: 'Financeiro no controle',
    text: 'Cobranças do mês em um clique, baixa de pagamento, estorno e recibo pronto pra imprimir.',
  },
  {
    icon: 'video',
    title: 'Sessões online',
    text: 'Gere o link da videocall em um clique e envie por WhatsApp ou e-mail.',
  },
  {
    icon: 'whatsapp',
    title: 'Tudo pelo WhatsApp',
    text: 'Confirme sessões e cobre pacientes sem sair do sistema.',
  },
  {
    icon: 'patient',
    title: 'Portal do paciente',
    text: 'Seus pacientes acompanham sessões, documentos e pagamentos pelo celular.',
  },
]

const steps = [
  {
    title: 'Crie sua conta',
    text: 'Leva menos de um minuto e você já começa com 7 dias grátis. Sem cartão de crédito.',
  },
  {
    title: 'Chame seus pacientes',
    text: 'Cadastre a turma, defina os valores e monte a agenda da semana.',
  },
  {
    title: 'Deixe o resto com a gente',
    text: 'Cobranças, links de sessão e relatórios no automático pra você focar nas sessões.',
  },
]

const planFeatures = [
  'Todos os recursos inclusos: agenda, pacientes e financeiro',
  'Sessões online + portal do paciente',
  'Cobranças e confirmações por WhatsApp e e-mail',
  'Relatórios, recibos e exportação de dados',
  'Atualizações constantes + suporte humano',
]

const faqs = [
  {
    q: 'Como funcionam os 7 dias grátis?',
    a: 'Você cria sua conta e usa o Psi Hub completo por 7 dias, sem compromisso. No fim do período, e só escolher um plano se quiser continuar.',
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
    a: 'Sim. O plano mensal não tem fidelidade: cancelou, acabou. No anual, o acesso segue até o fim do período já pago e depois e só não renovar.',
  },
  {
    q: 'Meus dados e os dos meus pacientes estão seguros?',
    a: 'Sim. Cada clínica enxerga apenas os próprios dados, a exclusão é reversível (lixeira) e dá pra exportar os dados do paciente quando quiser - tudo pensado pra LGPD.',
  },
]

/** Lista de recursos do plano (mesma nos dois cards). */
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

export function Landing() {
  const navigate = useNavigate()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-full bg-cream">
      {/* ---------- Barra de navegacao ---------- */}
      <header className="sticky top-0 z-40 border-b border-ink bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" aria-label="Psi Hub - início">
            <Logo size={34} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo(section.id)
                }}
                className="rounded-full px-3 py-2 font-round text-sm font-bold text-ink/60 transition hover:bg-white hover:text-ink"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button onClick={() => navigate('/cadastro')}>
              <Icon name="sparkles" size={17} />
              7 dias grátis
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="bg-dots">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge color="amber">
              <Icon name="sparkles" size={14} className="mr-1" />
              7 dias grátis em todos os planos
            </Badge>

            <h1 className="title-chips mt-5 font-display text-4xl uppercase leading-[1.18] tracking-normal text-balance text-ink sm:text-5xl lg:text-6xl">
              SUA CLÍNICA ORGANIZADA E SUA{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word -rotate-2 bg-brand text-white">CABECA</span>
              </span>{' '}
              TRANQUILA.
            </h1>

            <p className="mt-5 max-w-md font-round text-lg font-semibold leading-relaxed text-ink/70">
              Agenda, pacientes, sessões online e financeiro do seu consultorio num só lugar. Simples, bonito e do seu
              jeito.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button className="px-6 py-3 text-base" onClick={() => navigate('/cadastro')}>
                Começar grátis
                <Icon name="sparkles" size={18} />
              </Button>
              <Button variant="secondary" className="px-6 py-3 text-base" onClick={() => scrollTo('planos')}>
                Ver planos
              </Button>
            </div>

            <p className="mt-4 font-round text-xs font-bold text-ink/50">
              Comece sem cartão de crédito - só escolhe um plano se quiser continuar.
            </p>
          </div>

          {/* Mascote hero + chips flutuantes */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <span className="sticker absolute -left-2 top-6 z-10 hidden -rotate-6 rounded-2xl bg-sun px-3 py-1.5 font-round text-xs font-bold text-ink sm:inline-flex">
              sem bagunca
            </span>
            <span className="sticker absolute -right-1 bottom-20 z-10 hidden rotate-3 rounded-2xl bg-pop px-3 py-1.5 font-round text-xs font-bold text-white sm:inline-flex">
              tudo no lugar
            </span>

            <DoodleHeart className="absolute right-12 top-10 z-0 rotate-12" size={26} />

            <Mascot pose="hero" size={520} className="relative mx-auto h-auto w-full max-w-[26rem]" />

            <span className="sticker absolute left-1 top-1/3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-round text-xs font-bold text-ink">
              <Icon name="calendarCheck" size={15} accent="var(--color-brand)" />
              agenda em dia
            </span>
            <span className="sticker absolute -right-2 top-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-round text-xs font-bold text-ink">
              <Icon name="billing" size={15} accent="var(--color-sun)" />
              cobranças no automático
            </span>
            <span className="sticker absolute bottom-12 left-8 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-round text-xs font-bold text-ink">
              <Icon name="video" size={15} accent="var(--color-pop)" />
              sessões online
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Faixa de confianca ---------- */}
      <section className="border-y border-ink bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink bg-cream">
                <Icon name={item.icon} size={20} accent="var(--color-brand)" />
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
      <section id="recursos" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="title-chips font-display text-3xl uppercase leading-[1.18] text-ink sm:text-4xl">
              TUDO O QUE O CONSULTORIO PRECISA,{' '}
              <span className="whitespace-nowrap">
                <span className="sticker-word rotate-1 bg-sun">NUM SÓ LUGAR</span>
              </span>
              .
            </h2>
            <p className="mt-4 text-sm font-semibold text-ink/60 sm:text-base">
              Feito junto com psicólogos de verdade: o Psi Hub junta rotina, gente e dinheiro - sem planilha perdida por
              aí.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink bg-cream">
                  <Icon name={feature.icon} size={24} accent="var(--color-brand)" />
                </span>
                <h3 className="mt-4 font-display text-lg uppercase tracking-wide text-ink">{feature.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/60">{feature.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Como funciona ---------- */}
      <section id="como-funciona" className="scroll-mt-24 border-y border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl uppercase leading-[1.18] text-ink sm:text-4xl">COMEÇAR É SIMPLES</h2>
            <p className="mt-3 text-sm font-semibold text-ink/60 sm:text-base">
              Em menos de 5 minutos você está com a casa em ordem.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="sticker rounded-3xl bg-cream p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink bg-sun font-display text-xl text-ink shadow-ink">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-lg uppercase tracking-wide text-ink">{step.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/60">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Planos ---------- */}
      <section id="planos" className="scroll-mt-24 bg-dots">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge color="amber">comece grátis por 7 dias</Badge>
            <h2 className="mt-4 font-display text-3xl uppercase leading-[1.18] text-ink sm:text-4xl">
              UM PLANO PRA CADA JEITO DE CUIDAR
            </h2>
            <p className="mt-4 text-sm font-semibold text-ink/60 sm:text-base">
              Os recursos são os mesmos nos dois planos - você só escolhe como pagar. E os 7 dias grátis valem pra
              qualquer um deles.
            </p>
          </div>

          <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-6">
            {/* Mensal */}
            <Card className="flex flex-col rounded-[2rem] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl uppercase tracking-wide text-ink">Mensal</h3>
                <Badge color="slate">sem fidelidade</Badge>
              </div>
              <p className="mt-1 font-round text-sm font-semibold text-ink/55">Flexibilidade total, mês a mês.</p>

              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl leading-none text-ink">{formatCurrency(PRICE.monthly)}</span>
                <span className="pb-1 font-round text-sm font-bold text-ink/50">/mes</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-ink/60">
                Pago todo mês no cartão ou Pix. Cancelou? Acabou, sem multa e sem drama.
              </p>

              <PlanFeatureList />

              <Button variant="secondary" className="mt-6 w-full py-3" onClick={() => navigate('/cadastro')}>
                Começar 7 dias grátis
              </Button>
            </Card>

            {/* Anual */}
            <div className="sticker-lg relative flex flex-col rounded-[2rem] bg-brand p-6 text-white sm:p-8">
              <span className="absolute -top-4 right-6 rotate-2">
                <Badge color="amber">mais popular - economize {SAVINGS}%</Badge>
              </span>

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl uppercase tracking-wide">Anual</h3>
              </div>
              <p className="mt-1 font-round text-sm font-semibold text-white/75">12 meses pelo preço de 8.</p>

              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl leading-none">12x de {formatCurrency(PRICE.installment)}</span>
              </div>
              <p className="mt-2 font-round text-sm font-bold text-sun">
                {formatCurrency(ANNUAL_TOTAL)} no ano - economize {formatCurrency(MONTHLY_TOTAL - ANNUAL_TOTAL)} (
                {SAVINGS}%)
              </p>
              <p className="mt-1 text-sm font-semibold text-white/75">
                Equivale a {formatCurrency(PRICE.installment)} por mês, no cartão de crédito.
              </p>

              <PlanFeatureList tone="white" />

              <Button variant="sun" className="mt-6 w-full py-3" onClick={() => navigate('/cadastro')}>
                Começar 7 dias grátis
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center font-round text-xs font-bold text-ink/50">
            Sem cartão pra testar. Cancele quando quiser - a gente prefere convencer pelo produto.
          </p>
        </div>
      </section>

      {/* ---------- Duvidas frequentes ---------- */}
      <section id="duvidas" className="scroll-mt-24 border-y border-ink/10 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl uppercase leading-[1.18] text-ink sm:text-4xl">
              DÚVIDAS? A GENTE RESPONDE
            </h2>
            <p className="mt-3 text-sm font-semibold text-ink/60">
              Se ficar qualquer dúvida, chama no WhatsApp - a gente responde de verdade.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group sticker rounded-2xl bg-cream">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-round text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink bg-white transition-transform group-open:rotate-45">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm font-semibold leading-relaxed text-ink/60">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Chamada final ---------- */}
      <section className="px-4 py-14 sm:py-20">
        <div className="sticker-lg relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand px-6 py-12 text-white sm:px-12">
          <DoodleSparkle className="absolute left-6 top-6 -rotate-12 opacity-90" size={30} />
          <DoodleStar className="absolute bottom-8 left-1/3 hidden opacity-90 sm:block" size={22} color="#ffd43b" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="title-chips font-display text-3xl uppercase leading-[1.18] sm:text-4xl lg:text-5xl">
                PRONTO PRA DEIXAR O CONSULTORIO{' '}
                <span className="whitespace-nowrap">
                  <span className="sticker-word rotate-1 bg-sun text-ink">NO JEITO</span>
                </span>
                ?
              </h2>
              <p className="mt-5 max-w-lg font-round text-lg font-semibold text-white/85">
                Crie sua conta e teste tudo por 7 dias - de graça e sem cartão. Se não amar, é só não assinar.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button variant="sun" className="px-6 py-3 text-base" onClick={() => navigate('/cadastro')}>
                  <Icon name="sparkles" size={18} />
                  Começar grátis
                </Button>
                <Button variant="secondary" className="px-6 py-3 text-base" onClick={() => navigate('/login')}>
                  Já tenho conta
                </Button>
              </div>
            </div>

            <div className="relative mx-auto hidden items-center justify-center rounded-full border border-ink bg-cream p-6 shadow-ink-lg lg:flex">
              <Mascot pose="heart" size={150} />
              <DoodleSmiley className="absolute -right-6 top-0 rotate-12" size={34} color="#ffd43b" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Rodape ---------- */}
      <footer className="border-t border-ink bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo size={44} withBy />
            <p className="mt-3 max-w-xs text-sm font-semibold text-ink/60">
              Gestao de consultorio simples, bonita e do seu jeito. Feita pra quem cuida de gente.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <p className="font-round text-sm font-bold text-ink">Navegue</p>
              <ul className="mt-2 space-y-1.5 text-sm font-semibold text-ink/60">
                {navSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        scrollTo(section.id)
                      }}
                      className="transition hover:text-brand"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-round text-sm font-bold text-ink">Sua conta</p>
              <ul className="mt-2 space-y-1.5 text-sm font-semibold text-ink/60">
                <li>
                  <Link to="/login" className="transition hover:text-brand">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link to="/cadastro" className="transition hover:text-brand">
                    Criar conta grátis
                  </Link>
                </li>
                <li>
                  <Link to="/portal/login" className="transition hover:text-brand">
                    Portal do paciente
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-ink/15">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs font-semibold text-ink/50 sm:flex-row sm:items-center sm:justify-between">
            <p>Â© {new Date().getFullYear()} Psi Hub - by slooti</p>
            <p>
              Mensal {formatCurrency(PRICE.monthly)}/mes - Anual 12x de {formatCurrency(PRICE.installment)} (total de{' '}
              {formatCurrency(ANNUAL_TOTAL)}).
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

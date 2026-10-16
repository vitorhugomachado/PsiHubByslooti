import { useState } from 'react'
import { ICON_CATALOG, Icon, type IconName } from '../components/Icon'
import { MASCOT_POSES, Mascot } from '../components/Mascot'
import { Button, Card, PageHeader } from '../components/ui'

/**
 * Catalogo visual do design system de icones.
 * A lista vem de ICON_CATALOG (mesma fonte usada pelo componente <Icon>),
 * entao esta pagina nunca fica desatualizada em relacao ao codigo.
 */
export function DesignSystem() {
  const [colored, setColored] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const unique = new Set(ICON_CATALOG.flatMap((g) => g.items.map((i) => i.name))).size
  const total = ICON_CATALOG.reduce((acc, g) => acc + g.items.length, 0)

  async function copy(name: IconName) {
    const snippet = `<Icon name="${name}" />`
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(name)
      window.setTimeout(() => setCopied((c) => (c === name ? null : c)), 1400)
    } catch {
      window.prompt('Copie o nome do ícone:', snippet)
    }
  }

  return (
    <div>
      <PageHeader
        title="Design System"
        subtitle={`${unique} ícones em ${ICON_CATALOG.length} grupos (${total} aplicações). Clique para copiar o nome.`}
        action={
          <Button variant={colored ? 'primary' : 'secondary'} onClick={() => setColored((c) => !c)}>
            <Icon name="sparkles" size={18} />
            {colored ? 'Coloridos' : 'Monocromaticos'}
          </Button>
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg uppercase tracking-wide text-ink">Como usar</h2>
            <p className="mt-1 max-w-lg text-sm font-semibold text-ink/60">
              O contorno herda a cor do texto (<code className="rounded bg-cream px-1">currentColor</code>). As partes
              coloridas usam a prop <code className="rounded bg-cream px-1">accent</code> — sem ela o ícone fica
              monocromatico e funciona em qualquer fundo.
            </p>
          </div>
          <div className="flex items-end gap-4">
            {[16, 20, 24, 32, 40].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <Icon name="calendarHeart" size={s} accent={colored ? 'var(--color-brand)' : undefined} />
                <span className="font-round text-[10px] font-bold text-ink/50">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-ink bg-cream p-3 font-mono text-xs leading-relaxed text-ink">
          {`import { Icon } from '../components/Icon'

<Icon name="calendarHeart" />                                  // herda a cor do texto
<Icon name="wallet" size={24} accent="var(--color-brand)" />   // com destaque colorido`}
        </pre>
      </Card>

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg uppercase tracking-wide text-ink">Mascotes</h2>
          <span className="rounded-full border border-ink bg-cream px-2 py-0.5 font-round text-[11px] font-bold text-ink/70">
            {MASCOT_POSES.length} poses
          </span>
        </div>
        <Card className="p-3 sm:p-4">
          <p className="mb-3 text-sm font-semibold text-ink/60">
            Artes recortadas da folha de adesivos oficial (<code className="rounded bg-cream px-1">public/mascot/*.png</code>).
            Use com <code className="rounded bg-cream px-1">{`<Mascot pose="..." size={120} />`}</code>.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {MASCOT_POSES.map((pose) => (
              <div
                key={pose}
                className="flex flex-col items-center gap-2 rounded-2xl border border-transparent p-2 transition hover:border-ink hover:bg-cream"
              >
                <span className="flex h-16 w-16 items-center justify-center">
                  <Mascot pose={pose} size={64} />
                </span>
                <span className="text-center font-round text-[11px] font-bold leading-tight text-ink/70">{pose}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {ICON_CATALOG.map((group) => (
        <section key={group.group} className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-lg uppercase tracking-wide text-ink">{group.group}</h2>
            <span className="rounded-full border border-ink bg-cream px-2 py-0.5 font-round text-[11px] font-bold text-ink/70">
              {group.items.length}
            </span>
          </div>
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {group.items.map((item) => (
                <button
                  key={`${group.group}-${item.label}-${item.name}`}
                  type="button"
                  onClick={() => copy(item.name)}
                  title={`Copiar <Icon name="${item.name}" />`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-transparent p-2 transition hover:border-ink hover:bg-cream"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-ink bg-white">
                    <Icon name={item.name} size={24} accent={colored ? group.tone : undefined} />
                  </span>
                  <span className="text-center font-round text-[11px] font-bold leading-tight text-ink/70">
                    {copied === item.name ? <span className="text-brand">copiado!</span> : item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </section>
      ))}
    </div>
  )
}

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Modal, Spinner } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { formatMoney } from '../../lib/finance'
import {
  MAX_UPLOAD_BYTES,
  fileToBase64,
  formatFileSize,
  getPortalPatient,
  portalFetch,
  printText,
  type PortalFinance,
  type PortalPayment,
  type PortalProof,
} from '../../lib/portal'

/* ============================================================================
   Financeiro do paciente: o que esta em aberto, PIX para pagar, recibos das
   cobrancas pagas e envio de comprovante.
   ========================================================================== */

const METHOD: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  TRANSFER: 'Transferência',
}

const STATUS: Record<string, { label: string; color: 'blue' | 'green' | 'red' }> = {
  PENDING: { label: 'Pendente', color: 'blue' },
  PAID: { label: 'Pago', color: 'green' },
  OVERDUE: { label: 'Vencido', color: 'red' },
}

function receiptOf(payment: PortalPayment, patientName: string, clinicName: string): string {
  return [
    'RECIBO DE PAGAMENTO',
    `Clínica: ${clinicName}`,
    `Paciente: ${patientName}`,
    `Valor: ${formatMoney(payment.amount)}`,
    `Referente a: ${payment.description || 'Atendimento psicológico'}`,
    payment.method ? `Forma de pagamento: ${METHOD[payment.method] || payment.method}` : '',
    `Data: ${formatDate(payment.paidAt || payment.dueDate)}`,
    '',
    'Declaro ter recebido o valor acima referente aos serviços prestados.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function PortalFinance() {
  const qc = useQueryClient()
  const patient = getPortalPatient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<PortalPayment | null>(null)
  const [receipt, setReceipt] = useState<PortalPayment | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['portalPayments'],
    queryFn: () => portalFetch<PortalFinance>('/payments'),
  })

  const { data: proofs } = useQuery({
    queryKey: ['portalProofs'],
    queryFn: () => portalFetch<PortalProof[]>('/proofs'),
  })

  const upload = useMutation({
    mutationFn: (payload: { paymentId: string | null; fileName: string; mimeType: string; size: number; dataBase64: string }) =>
      portalFetch('/proofs', { method: 'POST', body: JSON.stringify({ ...payload, note: payload.paymentId ? undefined : 'Sem cobrança vinculada' }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portalProofs'] })
      qc.invalidateQueries({ queryKey: ['portalOverview'] })
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível enviar o comprovante'),
  })

  async function onPickFile(file: File | undefined) {
    if (!file) return
    setError('')
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('O arquivo precisa ter menos de 3 MB.')
      return
    }
    const dataBase64 = await fileToBase64(file)
    upload.mutate({
      paymentId: target?.id ?? null,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      dataBase64,
    })
    setTarget(null)
  }

  if (isLoading) return <Spinner />

  const payments = data?.payments ?? []
  const summary = data?.summary
  const open = payments.filter((p) => p.status !== 'PAID')
  const paid = payments.filter((p) => p.status === 'PAID')
  const pixKey = data?.pixKey ?? patient?.pixKey ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink">Meu financeiro</h1>
        <p className="mt-1 font-round text-sm font-semibold text-ink/55">Cobranças, pagamentos e recibos das suas sessões.</p>
      </div>

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sticker rounded-2xl bg-white p-4">
          <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">Em aberto</p>
          <p className="mt-1 font-display text-2xl leading-none tracking-wide text-ink">{formatMoney(summary?.openAmount || 0)}</p>
          <p className="mt-1 font-round text-[11px] font-semibold text-ink/55">{summary?.openCount || 0} cobrança(s)</p>
        </div>
        <div className={`sticker rounded-2xl p-4 ${summary && summary.overdueAmount > 0 ? 'bg-pop text-white' : 'bg-white'}`}>
          <p className="font-round text-[10px] font-bold uppercase tracking-wide opacity-60">Em atraso</p>
          <p className="mt-1 font-display text-2xl leading-none tracking-wide">{formatMoney(summary?.overdueAmount || 0)}</p>
          <p className="mt-1 font-round text-[11px] font-semibold opacity-80">
            {summary && summary.overdueAmount > 0 ? 'pague para regularizar' : 'tudo em dia'}
          </p>
        </div>
        <div className="sticker rounded-2xl bg-sun p-4">
          <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/50">Já paguei</p>
          <p className="mt-1 font-display text-2xl leading-none tracking-wide text-ink">{formatMoney(summary?.paidTotal || 0)}</p>
          <p className="mt-1 font-round text-[11px] font-semibold text-ink/60">{summary?.paidCount || 0} pagamento(s)</p>
        </div>
      </div>

      {/* PIX */}
      {pixKey && (
        <div className="sticker rounded-3xl bg-white p-4">
          <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/45">Chave PIX da clínica</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-dashed border-ink/30 bg-cream px-3 py-2 font-mono text-sm font-bold text-ink">
              {pixKey}
            </code>
            <Button
              variant="sun"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pixKey)
                  setPixCopied(true)
                  setTimeout(() => setPixCopied(false), 2500)
                } catch {
                  setError('Não foi possível copiar. Selecione a chave e copie manualmente.')
                }
              }}
            >
              {pixCopied ? 'Copiada!' : 'Copiar chave'}
            </Button>
          </div>
          <p className="mt-2 font-round text-[11px] font-semibold text-ink/50">
            Pagou? Envie o comprovante abaixo que o seu psicólogo confere.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>
      )}

      {/* Em aberto */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Em aberto</p>
        {open.length === 0 ? (
          <p className="font-round text-sm font-semibold text-ink/45">Nada em aberto por aqui. 🎉</p>
        ) : (
          <div className="space-y-3">
            {open.map((p) => (
              <div key={p.id} className={`sticker rounded-3xl p-4 ${p.status === 'OVERDUE' ? 'bg-pop/10' : 'bg-white'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl uppercase leading-none tracking-wide text-ink">{formatMoney(p.amount)}</p>
                    <p className="mt-1 font-round text-xs font-semibold text-ink/55">
                      {p.description || 'Atendimento psicológico'} · vence {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <Badge color={STATUS[p.status]?.color || 'blue'}>{STATUS[p.status]?.label || p.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-ink/15 pt-3">
                  {pixKey && (
                    <Button
                      variant="secondary"
                      className="!px-4 !py-1.5 !text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixKey)
                          setPixCopied(true)
                          setTimeout(() => setPixCopied(false), 2500)
                        } catch {
                          setError('Copie a chave PIX manualmente.')
                        }
                      }}
                    >
                      Copiar PIX
                    </Button>
                  )}
                  <Button
                    variant="sun"
                    className="!px-4 !py-1.5 !text-xs"
                    onClick={() => {
                      setTarget(p)
                      fileRef.current?.click()
                    }}
                  >
                    Enviar comprovante
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pagas */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Pagas</p>
        {paid.length === 0 ? (
          <p className="font-round text-sm font-semibold text-ink/45">Ainda não há pagamentos registrados.</p>
        ) : (
          <div className="sticker divide-y-2 divide-dashed divide-ink/10 overflow-hidden rounded-3xl bg-white">
            {paid.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-round text-sm font-bold text-ink">{formatMoney(p.amount)}</p>
                  <p className="font-round text-[11px] font-semibold text-ink/50">
                    {p.description || 'Atendimento psicológico'} · pago em {formatDate(p.paidAt)}
                    {p.method ? ` · ${METHOD[p.method] || p.method}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceipt(p)}
                  className="rounded-full border border-ink bg-white px-3 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink transition hover:bg-cream"
                >
                  Ver recibo
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comprovantes enviados */}
      <section>
        <p className="mb-2 font-round text-xs font-bold uppercase tracking-wide text-ink/45">Comprovantes enviados</p>
        {(proofs?.length || 0) === 0 ? (
          <p className="font-round text-sm font-semibold text-ink/45">Você ainda não enviou comprovantes.</p>
        ) : (
          <div className="sticker divide-y-2 divide-dashed divide-ink/10 overflow-hidden rounded-3xl bg-white">
            {proofs!.map((proof) => (
              <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-round text-sm font-bold text-ink">{proof.fileName}</p>
                  <p className="font-round text-[11px] font-semibold text-ink/50">
                    {formatDate(proof.createdAt)} · {formatFileSize(proof.size)}
                  </p>
                </div>
                <Badge color={proof.reviewedAt ? 'green' : 'amber'}>{proof.reviewedAt ? 'Conferido' : 'Aguardando'}</Badge>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setTarget(null)
            fileRef.current?.click()
          }}
          className="mt-3 rounded-full border border-ink bg-white px-4 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink transition hover:bg-cream"
        >
          Enviar outro comprovante
        </button>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          void onPickFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {upload.isPending && (
        <div className="sticker fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 font-round text-xs font-bold uppercase tracking-wide text-white">
          Enviando comprovante...
        </div>
      )}

      {/* Recibo */}
      <Modal open={Boolean(receipt)} title="Recibo" onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-4">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl border border-dashed border-ink/30 bg-cream p-4 font-mono text-xs leading-relaxed text-ink">
              {receiptOf(receipt, patient?.name || '', patient?.clinicName || 'Psi Hub')}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => printText('Recibo Psi Hub', receiptOf(receipt, patient?.name || '', patient?.clinicName || 'Psi Hub'))}
              >
                Imprimir
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(receiptOf(receipt, patient?.name || '', patient?.clinicName || 'Psi Hub'))
                    alert('Recibo copiado!')
                  } catch {
                    alert('Não foi possível copiar. Selecione o texto e copie manualmente.')
                  }
                }}
              >
                Copiar texto
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

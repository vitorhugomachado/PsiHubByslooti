import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Spinner, Textarea } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { getPortalPatient, portalFetch, type PortalMessage } from '../../lib/portal'

/* ============================================================================
   Recados entre o paciente e a clinica (nao e chat em tempo real).
   ========================================================================== */

export function PortalMessages() {
  const qc = useQueryClient()
  const patient = getPortalPatient()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['portalMessages'],
    queryFn: () => portalFetch<PortalMessage[]>('/messages'),
    refetchInterval: 30_000,
  })

  const send = useMutation({
    mutationFn: (body: string) => portalFetch('/messages', { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['portalMessages'] })
      qc.invalidateQueries({ queryKey: ['portalOverview'] })
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Não foi possível enviar'),
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [data?.length])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    send.mutate(body)
  }

  if (isLoading) return <Spinner />

  const messages = data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink">Recados</h1>
        <p className="mt-1 font-round text-sm font-semibold text-ink/55">
          Escreva para {patient?.clinicName || 'sua clínica'} — a resposta chega por aqui.
        </p>
      </div>

      <div className="rounded-2xl border border-ink bg-sun/70 px-3 py-2 font-round text-[11px] font-semibold leading-relaxed text-ink">
        Este canal não e para urgencias. Se você estiver em crise, ligue <strong>188</strong> (CVV, 24h) ou procure o pronto-socorro
        mais próximo.
      </div>

      <div className="sticker min-h-[45vh] rounded-3xl bg-white p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center font-round text-sm font-semibold text-ink/45">
            Nenhum recado ainda. Manda a primeira mensagem! 👋
          </p>
        )}

        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.author === 'PATIENT'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl border border-ink px-3 py-2 shadow-ink ${
                    mine ? 'bg-brand text-white' : 'bg-cream text-ink'
                  }`}
                >
                  {!mine && (
                    <p className="mb-1 font-round text-[10px] font-bold uppercase tracking-wide opacity-60">
                      {patient?.clinicName || 'Clínica'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap font-round text-sm font-semibold leading-relaxed">{m.body}</p>
                  <p className={`mt-1 font-round text-[10px] font-semibold ${mine ? 'text-white/70' : 'text-ink/40'}`}>
                    {formatDateTime(m.createdAt)}
                    {mine && m.readAt ? ' · lido' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um recado..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e as unknown as FormEvent)
              }
            }}
          />
        </div>
        <Button type="submit" disabled={send.isPending || !text.trim()}>
          {send.isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>
    </div>
  )
}

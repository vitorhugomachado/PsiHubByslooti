import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getToken } from '../../lib/api'
import { Badge, Button, Input, Label, Select, Spinner, Textarea } from '../ui'
import { formatDate, formatDateTime } from '../../lib/format'
import { whatsappLink } from '../../lib/session'
import { DOCUMENT_LABEL, MAX_UPLOAD_BYTES, fileToBase64, formatFileSize } from '../../lib/portal'

/* ============================================================================
   Aba "Portal" do paciente: libera o acesso, gera senha temporaria, manda o
   link e gerencia recados, comprovantes, tarefas, materiais e documentos.
   ========================================================================== */

type AdminPatientPortal = {
  patient: { id: string; name: string; email: string | null; phone: string | null }
  portal: { enabled: boolean; hasPassword: boolean; acceptedAt: string | null; lastSeenAt: string | null }
  messages: { id: string; author: 'PATIENT' | 'CLINIC'; body: string; createdAt: string; readAt: string | null }[]
  documents: { id: string; title: string; kind: string; fileName: string; mimeType: string; size: number; createdAt: string }[]
  materials: { id: string; title: string; kind: string; url: string; note: string | null; createdAt: string }[]
  tasks: { id: string; title: string; description: string | null; dueDate: string | null; doneAt: string | null; createdAt: string }[]
  proofs: { id: string; fileName: string; size: number; note: string | null; paymentId: string | null; reviewedAt: string | null; createdAt: string }[]
}

const MATERIAL_LABEL: Record<string, string> = {
  ARTICLE: 'Artigo',
  VIDEO: 'Vídeo',
  AUDIO: 'Áudio',
  LINK: 'Link',
}

async function fetchFileBlob(path: string): Promise<Blob | null> {
  const token = getToken()
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) return null
  return res.blob()
}

async function downloadFile(path: string, fileName: string) {
  const blob = await fetchFileBlob(path)
  if (!blob) return alert('Arquivo indisponível')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function openFile(path: string) {
  const blob = await fetchFileBlob(path)
  if (!blob) return alert('Arquivo indisponível')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink bg-white p-3.5 shadow-ink">
      <p className="mb-2 flex items-center gap-2 font-round text-[10px] font-bold uppercase tracking-wide text-ink/50">
        {title}
        {count != null && count > 0 && (
          <span className="rounded-full border border-ink bg-cream px-2 font-round text-[10px] font-bold text-ink">{count}</span>
        )}
      </p>
      {children}
    </div>
  )
}

export function PatientPortalTab({
  patientId,
  clinicName,
  onChanged,
}: {
  patientId: string
  clinicName: string
  onChanged?: () => void
}) {
  const qc = useQueryClient()
  const [tempPassword, setTempPassword] = useState('')
  const [message, setMessage] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [material, setMaterial] = useState({ title: '', kind: 'LINK', url: '', note: '' })
  const [docTitle, setDocTitle] = useState('')
  const [docKind, setDocKind] = useState('CERTIFICATE')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patientPortal', patientId],
    queryFn: () => apiFetch<AdminPatientPortal>(`/portal-admin/patients/${patientId}`),
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['patientPortal', patientId] })
    qc.invalidateQueries({ queryKey: ['portalSummary'] })
    onChanged?.()
  }

  const toggleAccess = useMutation({
    mutationFn: (enabled: boolean) => apiFetch(`/portal-admin/patients/${patientId}/access`, { method: 'POST', body: JSON.stringify({ enabled }) }),
    onSuccess: refresh,
  })

  const newPassword = useMutation({
    mutationFn: () => apiFetch<{ password: string }>(`/portal-admin/patients/${patientId}/password`, { method: 'POST', body: '{}' }),
    onSuccess: (res) => {
      setTempPassword(res.password)
      refresh()
    },
  })

  const resetAccess = useMutation({
    mutationFn: () => apiFetch(`/portal-admin/patients/${patientId}/reset`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      setTempPassword('')
      refresh()
    },
  })

  const sendMessage = useMutation({
    mutationFn: (body: string) => apiFetch(`/portal-admin/patients/${patientId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setMessage('')
      refresh()
    },
  })

  const addTask = useMutation({
    mutationFn: () =>
      apiFetch(`/portal-admin/patients/${patientId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle, description: taskDesc || undefined, dueDate: taskDue || null }),
      }),
    onSuccess: () => {
      setTaskTitle('')
      setTaskDesc('')
      setTaskDue('')
      refresh()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao criar tarefa'),
  })

  const removeTask = useMutation({
    mutationFn: (taskId: string) => apiFetch(`/portal-admin/patients/${patientId}/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })

  const addMaterial = useMutation({
    mutationFn: () =>
      apiFetch(`/portal-admin/patients/${patientId}/materials`, {
        method: 'POST',
        body: JSON.stringify({ title: material.title, kind: material.kind, url: material.url, note: material.note || undefined }),
      }),
    onSuccess: () => {
      setMaterial({ title: '', kind: 'LINK', url: '', note: '' })
      refresh()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao salvar material'),
  })

  const removeMaterial = useMutation({
    mutationFn: (id: string) => apiFetch(`/portal-admin/patients/${patientId}/materials/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })

  const addDocument = useMutation({
    mutationFn: (payload: { title: string; kind: string; fileName: string; mimeType: string; size: number; dataBase64: string }) =>
      apiFetch(`/portal-admin/patients/${patientId}/documents`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setDocTitle('')
      refresh()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao enviar documento'),
  })

  const removeDocument = useMutation({
    mutationFn: (docId: string) => apiFetch(`/portal-admin/patients/${patientId}/documents/${docId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })

  const reviewProof = useMutation({
    mutationFn: (proofId: string) => apiFetch(`/portal-admin/proofs/${proofId}/review`, { method: 'POST', body: '{}' }),
    onSuccess: refresh,
  })

  if (isLoading || !data) return <Spinner />

  const portalLink = `${window.location.origin}/portal/login`
  const firstName = data.patient.name.split(' ')[0]
  const pendingProofs = data.proofs.filter((p) => !p.reviewedAt).length
  const unread = data.messages.filter((m) => m.author === 'PATIENT' && !m.readAt).length

  function whatsappInvite(password: string) {
    const text = [
      `Oi, ${firstName}! Seu portal da ${clinicName} esta pronto: ${portalLink}`,
      '',
      password
        ? `Entre com o e-mail ${data!.patient.email || '(seu e-mail)'} e a senha temporária: ${password}`
        : `Clique em "Primeiro acesso" e crie sua senha usando o e-mail ${data!.patient.email || 'cadastrado'}.`,
      '',
      'Por lá você confirma presença, vê suas sessões e pagamentos, envia o comprovante e fala comigo.',
    ].join('\n')
    return whatsappLink(data!.patient.phone, text)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">
          {error}
          <button className="ml-2 underline" onClick={() => setError('')}>
            fechar
          </button>
        </div>
      )}

      {/* Acesso */}
      <Section title="Acesso do paciente">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={data.portal.enabled ? 'green' : 'slate'}>{data.portal.enabled ? 'Portal liberado' : 'Portal bloqueado'}</Badge>
          {data.portal.hasPassword ? <Badge color="blue">Senha criada</Badge> : <Badge color="amber">Sem senha ainda</Badge>}
          {unread > 0 && <Badge color="red">{unread} recado(s) novo(s)</Badge>}
          {pendingProofs > 0 && <Badge color="amber">{pendingProofs} comprovante(s) para conferir</Badge>}
        </div>

        <div className="mt-3 space-y-1 font-round text-[11px] font-semibold text-ink/55">
          <p>
            E-mail de acesso: <span className="font-bold text-ink">{data.patient.email || 'cadastre um e-mail no paciente'}</span>
          </p>
          <p>Senha criada em: {data.portal.acceptedAt ? formatDate(data.portal.acceptedAt) : '—'}</p>
          <p>Último acesso: {data.portal.lastSeenAt ? formatDateTime(data.portal.lastSeenAt) : 'nunca acessou'}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={data.portal.enabled ? 'secondary' : 'primary'}
            disabled={toggleAccess.isPending}
            onClick={() => toggleAccess.mutate(!data.portal.enabled)}
            className="!px-4 !py-1.5 !text-xs"
          >
            {data.portal.enabled ? 'Bloquear acesso' : 'Liberar acesso'}
          </Button>

          <Button
            variant="sun"
            disabled={!data.patient.email || newPassword.isPending}
            onClick={() => newPassword.mutate()}
            className="!px-4 !py-1.5 !text-xs"
          >
            {newPassword.isPending ? 'Gerando...' : data.portal.hasPassword ? 'Nova senha temporária' : 'Gerar senha'}
          </Button>

          <a
            href={whatsappInvite(tempPassword) || '#'}
            target="_blank"
            rel="noreferrer"
            className={`sticker sticker-press inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-round text-xs font-bold uppercase tracking-wide text-white ${
              data.patient.phone ? 'bg-[#25d366]' : 'pointer-events-none bg-ink/30'
            }`}
          >
            Enviar convite
          </a>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(portalLink)
                alert('Link do portal copiado!')
              } catch {
                alert(portalLink)
              }
            }}
            className="rounded-full border border-ink bg-white px-4 py-1.5 font-round text-xs font-bold uppercase tracking-wide shadow-ink transition hover:bg-cream"
          >
            Copiar link
          </button>

          {data.portal.hasPassword && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Apagar a senha atual? O paciente precisara criar outra no "Primeiro acesso".')) resetAccess.mutate()
              }}
              className="rounded-full border border-ink bg-white px-4 py-1.5 font-round text-xs font-bold uppercase tracking-wide text-ink/60 shadow-ink transition hover:bg-pop hover:text-white"
            >
              Voltar ao primeiro acesso
            </button>
          )}
        </div>

        {tempPassword && (
          <div className="mt-3 rounded-2xl border border-dashed border-ink/40 bg-sun/60 p-3">
            <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/50">Senha temporária</p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">{tempPassword}</p>
            <p className="mt-1 font-round text-[11px] font-semibold text-ink/60">
              Envie no WhatsApp (botão "Enviar convite") ou copie e mande para o paciente. Ele pode trocar depois.
            </p>
          </div>
        )}

        {!data.patient.email && (
          <p className="mt-3 rounded-xl border border-dashed border-ink/30 bg-cream px-3 py-2 font-round text-[11px] font-semibold text-ink/60">
            Para o portal funcionar, cadastre o e-mail do paciente na aba Resumo (botão Editar).
          </p>
        )}
      </Section>

      {/* Comprovantes */}
      {data.proofs.length > 0 && (
        <Section title="Comprovantes recebidos" count={data.proofs.length}>
          <div className="space-y-2">
            {data.proofs.map((proof) => (
              <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink bg-cream px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-round text-xs font-bold text-ink">{proof.fileName}</p>
                  <p className="font-round text-[10px] font-semibold text-ink/50">
                    {formatDateTime(proof.createdAt)} · {formatFileSize(proof.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {proof.reviewedAt ? <Badge color="green">Conferido</Badge> : <Badge color="amber">Novo</Badge>}
                  <button
                    type="button"
                    onClick={() => openFile(`/portal-admin/proofs/${proof.id}/file`)}
                    className="rounded-full border border-ink bg-white px-3 py-1 font-round text-[10px] font-bold uppercase tracking-wide shadow-ink"
                  >
                    Abrir
                  </button>
                  {!proof.reviewedAt && (
                    <button
                      type="button"
                      onClick={() => reviewProof.mutate(proof.id)}
                      className="rounded-full border border-ink bg-emerald-300 px-3 py-1 font-round text-[10px] font-bold uppercase tracking-wide shadow-ink"
                    >
                      Conferir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recados */}
      <Section title="Recados" count={unread}>
        {data.messages.length === 0 && <p className="font-round text-xs font-semibold text-ink/45">Nenhum recado trocado ainda.</p>}
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {data.messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border border-ink px-3 py-2 ${
                m.author === 'CLINIC' ? 'ml-6 bg-brand-light' : 'mr-6 bg-cream'
              }`}
            >
              <p className="font-round text-[10px] font-bold uppercase tracking-wide text-ink/45">
                {m.author === 'CLINIC' ? 'Clínica' : data.patient.name.split(' ')[0]} · {formatDateTime(m.createdAt)}
                {m.author === 'CLINIC' && m.readAt ? ' · lido' : ''}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap font-round text-sm font-semibold text-ink">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva um recado para o paciente..." />
          </div>
          <Button disabled={!message.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate(message.trim())} className="!px-4 !py-1.5 !text-xs">
            Enviar
          </Button>
        </div>
      </Section>

      {/* Tarefas */}
      <Section title="Tarefas entre sessões" count={data.tasks.length}>
        <div className="space-y-2">
          {data.tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between gap-2 rounded-xl border border-ink bg-cream px-3 py-2">
              <div className="min-w-0">
                <p className={`font-round text-xs font-bold text-ink ${task.doneAt ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                {task.description && <p className="font-round text-[10px] font-semibold text-ink/55">{task.description}</p>}
                <p className="font-round text-[10px] font-semibold text-ink/45">
                  {task.doneAt ? `feita em ${formatDate(task.doneAt)}` : task.dueDate ? `até ${formatDate(task.dueDate)}` : 'sem prazo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeTask.mutate(task.id)}
                className="shrink-0 rounded-full border border-ink bg-white px-2 py-0.5 font-round text-[10px] font-bold uppercase text-ink/60 hover:bg-pop hover:text-white"
              >
                Excluir
              </button>
            </div>
          ))}
          {data.tasks.length === 0 && <p className="font-round text-xs font-semibold text-ink/45">Nenhuma tarefa proposta.</p>}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input placeholder="Ex.: Registrar 3 situações de ansiedade" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          <Input placeholder="Detalhes (opcional)" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className="sm:col-span-1" />
          <Button
            disabled={taskTitle.trim().length < 2 || addTask.isPending}
            onClick={() => addTask.mutate()}
            className="!px-4 !py-2 !text-xs"
          >
            Adicionar tarefa
          </Button>
        </div>
      </Section>

      {/* Materiais */}
      <Section title="Materiais recomendados" count={data.materials.length}>
        <div className="space-y-2">
          {data.materials.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl border border-ink bg-cream px-3 py-2">
              <div className="min-w-0">
                <p className="font-round text-xs font-bold text-ink">{m.title}</p>
                <p className="truncate font-round text-[10px] font-semibold text-ink/50">
                  {MATERIAL_LABEL[m.kind] || m.kind} · {m.url}
                </p>
                {m.note && <p className="font-round text-[10px] font-semibold text-ink/55">{m.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeMaterial.mutate(m.id)}
                className="shrink-0 rounded-full border border-ink bg-white px-2 py-0.5 font-round text-[10px] font-bold uppercase text-ink/60 hover:bg-pop hover:text-white"
              >
                Excluir
              </button>
            </div>
          ))}
          {data.materials.length === 0 && <p className="font-round text-xs font-semibold text-ink/45">Nenhum material enviado.</p>}
        </div>

        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input placeholder="Título do material" value={material.title} onChange={(e) => setMaterial({ ...material, title: e.target.value })} />
            <Select value={material.kind} onChange={(e) => setMaterial({ ...material, kind: e.target.value })}>
              {Object.entries(MATERIAL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Input placeholder="https://..." value={material.url} onChange={(e) => setMaterial({ ...material, url: e.target.value })} />
          <Input
            placeholder="Por que estou recomendando (opcional)"
            value={material.note}
            onChange={(e) => setMaterial({ ...material, note: e.target.value })}
          />
          <Button
            disabled={material.title.trim().length < 2 || !material.url || addMaterial.isPending}
            onClick={() => addMaterial.mutate()}
            className="!px-4 !py-2 !text-xs"
          >
            Enviar material
          </Button>
        </div>
      </Section>

      {/* Documentos */}
      <Section title="Documentos do paciente" count={data.documents.length}>
        <div className="space-y-2">
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink bg-cream px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-round text-xs font-bold text-ink">{doc.title}</p>
                <p className="font-round text-[10px] font-semibold text-ink/50">
                  {DOCUMENT_LABEL[doc.kind] || doc.kind} · {formatFileSize(doc.size)} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile(`/portal-admin/patients/${patientId}/documents/${doc.id}/file`, doc.fileName)}
                  className="rounded-full border border-ink bg-white px-3 py-1 font-round text-[10px] font-bold uppercase tracking-wide shadow-ink"
                >
                  Baixar
                </button>
                <button
                  type="button"
                  onClick={() => removeDocument.mutate(doc.id)}
                  className="rounded-full border border-ink bg-white px-3 py-1 font-round text-[10px] font-bold uppercase tracking-wide text-ink/60 shadow-ink hover:bg-pop hover:text-white"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {data.documents.length === 0 && <p className="font-round text-xs font-semibold text-ink/45">Nenhum documento enviado.</p>}
        </div>

        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input placeholder="Título (ex.: Atestado de acompanhamento)" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            <Select value={docKind} onChange={(e) => setDocKind(e.target.value)}>
              {Object.entries(DOCUMENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Anexo (PDF ou imagem, até 3 MB)</Label>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="w-full rounded-xl border border-dashed border-ink/40 bg-cream px-3 py-2 font-round text-xs font-semibold text-ink"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (!docTitle.trim()) return setError('Dê um título ao documento antes de anexar o arquivo.')
                if (file.size > MAX_UPLOAD_BYTES) return setError('O arquivo precisa ter menos de 3 MB.')
                setError('')
                const dataBase64 = await fileToBase64(file)
                addDocument.mutate({
                  title: docTitle.trim(),
                  kind: docKind,
                  fileName: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  size: file.size,
                  dataBase64,
                })
              }}
            />
          </div>
        </div>
      </Section>
    </div>
  )
}

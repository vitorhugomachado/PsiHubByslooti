import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import {
  DOCUMENT_LABEL,
  MATERIAL_ICON,
  clearPortalSession,
  formatFileSize,
  getPortalPatient,
  portalDownload,
  portalFetch,
  updatePortalPatient,
  type PortalDocument,
  type PortalMaterial,
  type PortalTask,
} from '../../lib/portal'

/* ============================================================================
   "Mais": dados cadastrais, tarefas, materiais recomendados e documentos.
   ========================================================================== */

export function PortalMore() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const patient = getPortalPatient()

  const [phone, setPhone] = useState(patient?.phone || '')
  const [email, setEmail] = useState(patient?.email || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPhone(patient?.phone || '')
    setEmail(patient?.email || '')
  }, [patient?.phone, patient?.email])

  const tasks = useQuery({ queryKey: ['portalTasks'], queryFn: () => portalFetch<PortalTask[]>('/tasks') })
  const materials = useQuery({ queryKey: ['portalMaterials'], queryFn: () => portalFetch<PortalMaterial[]>('/materials') })
  const documents = useQuery({ queryKey: ['portalDocuments'], queryFn: () => portalFetch<PortalDocument[]>('/documents') })

  const saveContact = useMutation({
    mutationFn: () => portalFetch<{ name: string }>('/contact', { method: 'PUT', body: JSON.stringify({ phone, email }) }),
    onSuccess: () => {
      const current = getPortalPatient()
      if (current) updatePortalPatient({ ...current, phone, email })
      setSaved(true)
      setError('')
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível salvar'),
  })

  const toggleTask = useMutation({
    mutationFn: (id: string) => portalFetch(`/tasks/${id}/toggle`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portalTasks'] })
      qc.invalidateQueries({ queryKey: ['portalOverview'] })
    },
  })

  function exit() {
    clearPortalSession()
    logout()
    navigate('/portal/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-ink">Mais</h1>
        <p className="mt-1 font-round text-sm font-semibold text-ink/55">Seus dados, tarefas, materiais e documentos.</p>
      </div>

      {/* Meus dados */}
      <section className="sticker rounded-3xl bg-white p-4">
        <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/45">Meus dados</p>
        <p className="mt-1 font-round text-[11px] font-semibold text-ink/50">
          Mantenha o telefone e o e-mail atualizados — é por eles que a clínica fala com você.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-ink bg-pop/90 px-3 py-2 font-round text-sm font-bold text-white">{error}</div>
        )}

        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveContact.mutate()
          }}
        >
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Telefone (WhatsApp)</Label>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saveContact.isPending}>
              {saveContact.isPending ? 'Salvando...' : 'Salvar meus dados'}
            </Button>
            {saved && <span className="font-round text-xs font-bold uppercase tracking-wide text-emerald-700">Salvo!</span>}
          </div>
        </form>
      </section>

      {/* Tarefas */}
      <section className="sticker rounded-3xl bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/45">Tarefas entre sessões</p>
          {tasks.data && tasks.data.filter((t) => !t.doneAt).length > 0 && (
            <span className="rounded-full border border-ink bg-sun px-2.5 font-round text-[10px] font-bold uppercase tracking-wide">
              {tasks.data.filter((t) => !t.doneAt).length} a fazer
            </span>
          )}
        </div>

        {tasks.isLoading && <Spinner />}

        {tasks.data?.length === 0 && (
          <p className="mt-2 font-round text-sm font-semibold text-ink/45">Nenhuma tarefa no momento.</p>
        )}

        <div className="mt-3 space-y-2">
          {tasks.data?.map((task) => {
            const late = !task.doneAt && task.dueDate && new Date(task.dueDate).getTime() < Date.now()
            return (
              <label
                key={task.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-ink p-3 transition ${
                  task.doneAt ? 'bg-emerald-50' : late ? 'bg-pop/10' : 'bg-cream'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(task.doneAt)}
                  disabled={toggleTask.isPending}
                  onChange={() => toggleTask.mutate(task.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#2e7bf6]"
                />
                <span className="min-w-0">
                  <span className={`block font-round text-sm font-bold text-ink ${task.doneAt ? 'line-through opacity-60' : ''}`}>
                    {task.title}
                  </span>
                  {task.description && <span className="mt-0.5 block font-round text-[11px] font-semibold text-ink/55">{task.description}</span>}
                  {task.dueDate && (
                    <span className={`mt-0.5 block font-round text-[11px] font-semibold ${late ? 'text-pop' : 'text-ink/45'}`}>
                      {late ? 'estava para ' : 'ate '} {formatDate(task.dueDate)}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </section>

      {/* Materiais */}
      <section className="sticker rounded-3xl bg-white p-4">
        <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/45">Materiais recomendados</p>

        {materials.isLoading && <Spinner />}
        {materials.data?.length === 0 && (
          <p className="mt-2 font-round text-sm font-semibold text-ink/45">Seu psicólogo ainda não recomendou materiais.</p>
        )}

        <div className="mt-3 space-y-2">
          {materials.data?.map((material) => (
            <a
              key={material.id}
              href={material.url}
              target="_blank"
              rel="noreferrer"
              className="sticker sticker-press flex items-start gap-3 rounded-2xl bg-cream p-3"
            >
              <span className="text-xl leading-none">{MATERIAL_ICON[material.kind] || '🔗'}</span>
              <span className="min-w-0">
                <span className="block font-round text-sm font-bold text-ink">{material.title}</span>
                {material.note && <span className="mt-0.5 block font-round text-[11px] font-semibold text-ink/55">{material.note}</span>}
                <span className="mt-1 block truncate font-round text-[10px] font-bold uppercase tracking-wide text-brand">
                  Abrir material
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Documentos */}
      <section className="sticker rounded-3xl bg-white p-4">
        <p className="font-round text-xs font-bold uppercase tracking-wide text-ink/45">Documentos</p>

        {documents.isLoading && <Spinner />}
        {documents.data?.length === 0 && (
          <p className="mt-2 font-round text-sm font-semibold text-ink/45">Nenhum documento disponível.</p>
        )}

        <div className="mt-3 space-y-2">
          {documents.data?.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink bg-cream p-3">
              <div className="min-w-0">
                <p className="truncate font-round text-sm font-bold text-ink">{doc.title}</p>
                <p className="font-round text-[11px] font-semibold text-ink/50">
                  {DOCUMENT_LABEL[doc.kind] || 'Documento'} · {formatFileSize(doc.size)} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => portalDownload(`/documents/${doc.id}/file`, doc.fileName)}
                className="rounded-full border border-ink bg-white px-3 py-1.5 font-round text-[11px] font-bold uppercase tracking-wide shadow-ink transition hover:bg-sun"
              >
                Baixar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Sair */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink bg-white/70 p-4">
        <div>
          <p className="font-round text-sm font-bold text-ink">{patient?.name}</p>
          <p className="font-round text-xs font-semibold text-ink/50">{patient?.email}</p>
        </div>
        <Button variant="danger" onClick={exit}>
          Sair do portal
        </Button>
      </section>

      <p className="pb-2 text-center font-round text-[11px] font-semibold text-ink/40">
        Portal do paciente · {patient?.clinicName} · powered by Psi Hub
      </p>
    </div>
  )
}

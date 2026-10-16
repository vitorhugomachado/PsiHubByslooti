const TOKEN_KEY = 'psigest.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status = 0, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

// Wrapper de fetch que injeta o token e trata erros de forma consistente.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }
  // So define Content-Type quando ha corpo: o Fastify rejeita corpo vazio em JSON.
  if (options.body != null) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || 'Erro na requisicao', res.status, data)
  }
  return data as T
}

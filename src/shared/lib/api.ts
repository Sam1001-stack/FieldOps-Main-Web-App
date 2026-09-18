/** Sanctum fetch helper for the office SPA. Adds Bearer token and X-Organization-Id. */
const TOKEN_KEY = 'fieldops.token'

/** Local Vite leaves this empty (proxy). Production uses the Render API. */
const DEFAULT_API = 'https://fieldops-backend-app.onrender.com'

export const API_BASE = String(
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_API : ''),
).replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

const ADMIN_TOKEN_KEY = 'fieldops.adminToken'
const ORG_KEY = 'fieldops.orgId'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getOrgId() {
  return localStorage.getItem(ORG_KEY)
}

export function setOrgId(id: string | null) {
  if (!id) localStorage.removeItem(ORG_KEY)
  else localStorage.setItem(ORG_KEY, id)
}

export function setToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ORG_KEY)
  } else {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function beginImpersonation(token: string) {
  const current = getToken()
  if (current) localStorage.setItem(ADMIN_TOKEN_KEY, current)
  localStorage.setItem(TOKEN_KEY, token)
}

export function stopImpersonation() {
  const admin = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!admin) return false
  localStorage.setItem(TOKEN_KEY, admin)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  return true
}

export function isImpersonating() {
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY))
}

export async function downloadAuthenticated(path: string, filename: string) {
  const headers = new Headers()
  headers.set('Accept', 'application/json, text/csv')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const orgId = getOrgId()
  if (orgId) headers.set('X-Organization-Id', orgId)

  const res = await fetch(apiUrl(path), { headers })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || 'Export fehlgeschlagen')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const orgId = getOrgId()
  if (orgId) headers.set('X-Organization-Id', orgId)

  const res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 204) return undefined as T
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.message || 'Anfrage fehlgeschlagen') as Error & { code?: string; status?: number }
    err.code = json.code
    err.status = res.status
    throw err
  }
  return json as T
}

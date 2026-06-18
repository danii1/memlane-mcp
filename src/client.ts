const BASE = process.env.MEMLANE_API_URL ?? "https://api.memlane.io"
const API_KEY = process.env.MEMLANE_API_KEY

if (!API_KEY) {
  console.error("MEMLANE_API_KEY is required")
  process.exit(1)
}

export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => null)) as T & { error?: string }
  if (!res.ok) {
    throw new Error((json as { error?: string })?.error ?? `HTTP ${res.status}`)
  }
  return json as T
}

export async function apiGet<T>(path: string): Promise<T> {
  return api<T>("GET", path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return api<T>("POST", path, body)
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return api<T>("PATCH", path, body)
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return api<T>("DELETE", path, body)
}

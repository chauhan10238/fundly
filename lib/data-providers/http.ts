export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...init.headers },
      next: init.next ?? { revalidate: 300 },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`)
    return await response.json() as T
  } finally { clearTimeout(timeout) }
}
export function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "" || value === ".") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}
export const err = (error: unknown) => error instanceof Error ? error.message : "Unknown provider error"

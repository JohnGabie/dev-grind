export function isInsightNew(generatedAt: string, openedAt: string | null): boolean {
  const generated = Date.parse(generatedAt)
  if (Number.isNaN(generated)) return false
  if (!openedAt) return true
  const opened = Date.parse(openedAt)
  if (Number.isNaN(opened)) return true
  return generated > opened
}

const OPENED_KEY = 'insight_opened_at'

export function readInsightOpenedAt(): string | null {
  try { return localStorage.getItem(OPENED_KEY) } catch { return null }
}

export function writeInsightOpenedAt(): void {
  try { localStorage.setItem(OPENED_KEY, new Date().toISOString()) } catch { /* storage is unavailable */ }
}

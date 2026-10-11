export function isInsightNew(generatedAt: string, openedAt: string | null): boolean {
  const generated = Date.parse(generatedAt)
  if (Number.isNaN(generated)) return false
  if (!openedAt) return true
  const opened = Date.parse(openedAt)
  if (Number.isNaN(opened)) return true
  return generated > opened
}

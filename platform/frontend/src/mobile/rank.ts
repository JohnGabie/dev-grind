const RANK_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

export function rankColor(rank: string): string {
  return RANK_COLOR[rank] ?? '#525252'
}

export function nextRank(rank: string): string | null {
  const n = Number.parseInt(rank, 10)
  if (!Number.isFinite(n) || n <= 1) return null
  return `${n - 1}kyu`
}

export function honorMissing(honor: number, honorForNext: number): number {
  return Math.max(0, Math.round(honorForNext - honor))
}

export function progressPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(100, Math.max(0, Math.round(progress * 100)))
}

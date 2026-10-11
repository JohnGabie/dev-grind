import { honorMissing, nextRank, progressPercent, rankColor } from './rank.ts'

const VALUE_COLOR = 'var(--text)'

export interface StatusInput {
  rank: string
  honor: number
  honor_for_next_rank: number
  rank_progress: number
  current_streak: number
  weekly: number
}

export interface StatusLine {
  key: string
  value: string | number
  color: string
  comma: boolean
}

export function buildStatusLines(s: StatusInput): StatusLine[] {
  const next = nextRank(s.rank)
  const lines: Omit<StatusLine, 'comma'>[] = [
    { key: 'rank', value: s.rank, color: rankColor(s.rank) },
    { key: 'honor', value: s.honor, color: VALUE_COLOR },
  ]
  if (next && s.honor < s.honor_for_next_rank) {
    lines.push({ key: 'proximo', value: next, color: VALUE_COLOR })
    lines.push({ key: 'faltam', value: honorMissing(s.honor, s.honor_for_next_rank), color: VALUE_COLOR })
  }
  lines.push(
    { key: 'progresso', value: `${progressPercent(s.rank_progress)}%`, color: VALUE_COLOR },
    { key: 'streak', value: s.current_streak, color: VALUE_COLOR },
    { key: 'semana', value: s.weekly, color: VALUE_COLOR },
  )
  return lines.map((l, i) => ({ ...l, comma: i < lines.length - 1 }))
}

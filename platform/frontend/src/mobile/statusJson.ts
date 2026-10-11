import { honorMissing, nextRank, progressPercent, rankColor } from './rank.ts'

export interface StatusInput {
  rank: string
  honor: number
  honor_for_next_rank: number
  rank_progress: number
  current_streak: number
  weekly: number
}

// `color` is set only for the rank line; every other value is coloured by its type.
export interface StatusLine {
  key: string
  value: string | number
  color?: string
  comma: boolean
}

export function buildStatusLines(s: StatusInput): StatusLine[] {
  const next = nextRank(s.rank)
  const lines: Omit<StatusLine, 'comma'>[] = [
    { key: 'rank', value: s.rank, color: rankColor(s.rank) },
    { key: 'honor', value: s.honor },
  ]
  if (next && s.honor < s.honor_for_next_rank) {
    lines.push({ key: 'proximo', value: next })
    lines.push({ key: 'faltam', value: honorMissing(s.honor, s.honor_for_next_rank) })
  }
  lines.push(
    { key: 'progresso', value: `${progressPercent(s.rank_progress)}%` },
    { key: 'streak', value: s.current_streak },
    { key: 'semana', value: s.weekly },
  )
  return lines.map((l, i) => ({ ...l, comma: i < lines.length - 1 }))
}

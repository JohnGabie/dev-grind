import { honorMissing, nextRank, progressPercent, rankColor } from './rank.ts'
import { HONOR_COLOR, STREAK_COLOR, SYNTAX_MUTED, WEEK_COLOR } from './palette.ts'

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

export function blockBar(progress: number, width = 10): string {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const filled = Math.round(p * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export function buildStatusLines(s: StatusInput): StatusLine[] {
  const next = nextRank(s.rank)
  const lines: Omit<StatusLine, 'comma'>[] = [
    { key: 'rank', value: s.rank, color: rankColor(s.rank) },
    { key: 'honor', value: s.honor, color: HONOR_COLOR },
  ]
  if (next && s.honor < s.honor_for_next_rank) {
    lines.push({ key: 'proximo', value: next, color: rankColor(next) })
    lines.push({ key: 'faltam', value: honorMissing(s.honor, s.honor_for_next_rank), color: HONOR_COLOR })
  }
  lines.push(
    { key: 'progresso', value: `${blockBar(s.rank_progress)} ${progressPercent(s.rank_progress)}%`, color: rankColor(s.rank) },
    { key: 'streak', value: s.current_streak, color: s.current_streak > 0 ? STREAK_COLOR : SYNTAX_MUTED },
    { key: 'semana', value: s.weekly, color: WEEK_COLOR },
  )
  return lines.map((l, i) => ({ ...l, comma: i < lines.length - 1 }))
}

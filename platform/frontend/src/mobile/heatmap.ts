export interface HeatmapDay { total: number; katas: number; books: number; courses: number }
export interface HeatCell { date: string; data: HeatmapDay; isToday: boolean; inRange: boolean }

const EMPTY: HeatmapDay = { total: 0, katas: 0, books: 0, courses: 0 }

export const LEVEL_COLOR = [
  'rgba(255,255,255,0.05)', 'rgba(34,211,238,0.30)', 'rgba(34,211,238,0.52)',
  'rgba(34,211,238,0.74)', 'rgba(34,211,238,0.93)',
]
export const TODAY_EMPTY = 'rgba(34,211,238,0.13)'

export function levelOf(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0
  if (total >= 4) return 4
  return total as 1 | 2 | 3
}

// Weeks start on Sunday. The last week is padded with nulls after today.
export function buildWeeks(heatmap: Record<string, HeatmapDay>, today: Date, weekCount: number): (HeatCell | null)[][] {
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)
  const gridStart = new Date(end)
  gridStart.setDate(end.getDate() - end.getDay() - (weekCount - 1) * 7)

  const weeks: (HeatCell | null)[][] = []
  let week: (HeatCell | null)[] = []
  const cur = new Date(gridStart)
  while (cur <= end) {
    const key = cur.toISOString().split('T')[0]
    week.push({ date: key, data: heatmap[key] ?? EMPTY, isToday: cur.getTime() === end.getTime(), inRange: true })
    if (week.length === 7) { weeks.push(week); week = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

export function describeDay(date: string, data: HeatmapDay): string {
  const when = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (data.total === 0) return `${when} · sem atividade`
  const parts: string[] = []
  if (data.katas > 0) parts.push(`${data.katas} kata${data.katas !== 1 ? 's' : ''}`)
  if (data.courses > 0) parts.push(`${data.courses} aula${data.courses !== 1 ? 's' : ''}`)
  if (data.books > 0) parts.push(`${data.books} livro${data.books !== 1 ? 's' : ''}`)
  return `${when} · ${parts.join(', ')}`
}

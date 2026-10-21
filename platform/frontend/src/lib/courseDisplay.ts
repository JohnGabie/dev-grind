import type { CourseState } from './courseProgress'

export const STATE_COLOR: Record<CourseState, string> = {
  'não iniciado': 'var(--muted)',
  'em andamento': 'var(--cyan)',
  'concluído': 'var(--green)',
}

export function percentOf(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

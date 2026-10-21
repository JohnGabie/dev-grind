import type { CourseState } from '../lib/courseProgress'

export const STATE_COLOR: Record<CourseState, string> = {
  'não iniciado': 'var(--muted)',
  'em andamento': 'var(--cyan)',
  'concluído': 'var(--green)',
}

export function percentOf(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export default function ProgressBar({ done, total, label, done100 }: { done: number; total: number; label: string; done100: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}
    >
      <div style={{ height: '100%', width: `${percentOf(done, total)}%`, background: done100 ? 'var(--green)' : 'var(--cyan)' }} />
    </div>
  )
}

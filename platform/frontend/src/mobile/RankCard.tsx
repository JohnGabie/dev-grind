import { honorMissing, nextRank, progressPercent, rankColor } from './rank'

interface RankCardProps { rank: string; honor: number; honorForNext: number; progress: number }

export default function RankCard({ rank, honor, honorForNext, progress }: RankCardProps) {
  const color = rankColor(rank)
  const next = nextRank(rank)
  const pct = progressPercent(progress)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
        <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color, lineHeight: 'var(--lh-xl)' }}>{rank}</span>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{honor.toLocaleString('pt-BR')} / {honorForNext.toLocaleString('pt-BR')} honor</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', marginTop: 'var(--sp-3)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      {next && honor < honorForNext && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginTop: 'var(--sp-2)' }}>
          faltam {honorMissing(honor, honorForNext).toLocaleString('pt-BR')} para {next}
        </div>
      )}
    </div>
  )
}

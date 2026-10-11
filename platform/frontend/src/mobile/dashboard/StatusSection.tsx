import { useNavigate } from 'react-router-dom'
import Section from '../Section'
import SectionState from '../SectionState'
import { buildStatusLines } from '../statusJson'
import Surface from '../Surface'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'
import StatusJson from './StatusJson'

export default function StatusSection({ stats }: { stats: Slot<UserStats> }) {
  const navigate = useNavigate()
  const s = stats.data
  if (stats.status !== 'ready' || !s) {
    return (
      <Section label="estado">
        <SectionState status={stats.status} onRetry={stats.retry}>{null}</SectionState>
      </Section>
    )
  }
  const weekly = s.weekly_summary.completed_last_7_days
  const lines = buildStatusLines({
    rank: s.rank, honor: s.honor, honor_for_next_rank: s.honor_for_next_rank,
    rank_progress: s.rank_progress, current_streak: s.current_streak, weekly,
  })
  return (
    <div style={{ marginTop: 'var(--sp-5)' }}>
      <SectionState status={stats.status} onRetry={stats.retry}>
        <Surface
          onClick={() => navigate('/profile')}
          label={`status: ${s.rank}, ${s.honor} de honor, streak ${s.current_streak}, semana ${weekly}`}
        >
          <StatusJson lines={lines} />
        </Surface>
      </SectionState>
    </div>
  )
}

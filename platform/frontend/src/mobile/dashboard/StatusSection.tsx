import { useNavigate } from 'react-router-dom'
import SectionState from '../SectionState'
import PromptLine from '../PromptLine'
import { buildStatusLines } from '../statusJson'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'
import WindowFrame from '../WindowFrame'
import StatusJson from './StatusJson'

export default function StatusSection({ stats, user }: { stats: Slot<UserStats>; user: string }) {
  const navigate = useNavigate()
  const s = stats.data
  if (stats.status !== 'ready' || !s) {
    return (
      <div style={{ marginTop: 'var(--sp-5)' }}>
        <WindowFrame title="status.json" ariaLabel="estado">
          <div style={{ marginBottom: 'var(--sp-2)' }}>
            <PromptLine user={user} command="cat status.json" cursor={false} />
          </div>
          <SectionState status={stats.status} onRetry={stats.retry}>{null}</SectionState>
        </WindowFrame>
      </div>
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
        <WindowFrame
          title="status.json"
          onClick={() => navigate('/profile')}
          ariaLabel={`status: ${s.rank}, ${s.honor} de honor, streak ${s.current_streak}, semana ${weekly}`}
        >
          <div style={{ marginBottom: 'var(--sp-2)' }}>
            <PromptLine user={user} command="cat status.json" cursor={false} />
          </div>
          <StatusJson lines={lines} />
        </WindowFrame>
      </SectionState>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import RankCard from '../RankCard'
import SectionState from '../SectionState'
import { Stat, StatRow } from '../Stat'
import Surface from '../Surface'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'

export default function StatusSection({ stats }: { stats: Slot<UserStats> }) {
  const navigate = useNavigate()
  const s = stats.data
  return (
    <div style={{ marginTop: 'var(--sp-5)' }}>
      <SectionState status={stats.status} onRetry={stats.retry}>
        {s && (
          <Surface onClick={() => navigate('/profile')}>
            <RankCard rank={s.rank} honor={s.honor} honorForNext={s.honor_for_next_rank} progress={s.rank_progress} />
            <StatRow>
              <Stat value={s.current_streak} label="streak" />
              <Stat value={s.weekly_summary.completed_last_7_days} label="semana" />
              <Stat value={s.honor.toLocaleString('pt-BR')} label="honor" />
            </StatRow>
          </Surface>
        )}
      </SectionState>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { statusWord, timeAgo } from '../format'
import ListRow from '../ListRow'
import { rankColor } from '../rank'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { RecentExercise } from '../types'

export default function HistorySection({ recent }: { recent: Slot<RecentExercise[]> }) {
  const navigate = useNavigate()
  const seen = new Set<string>()
  const items = (recent.data ?? []).filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 5)

  return (
    <Section label="histórico">
      <SectionState status={recent.status} empty={items.length === 0} emptyText="nada por aqui ainda" onRetry={recent.retry}>
        {items.map(item => (
          <ListRow
            key={item.id}
            tag={item.difficulty}
            tagColor={rankColor(item.difficulty)}
            title={item.title}
            meta={`${statusWord(item.status)} · ${timeAgo(item.submitted_at)}`}
            onClick={() => navigate(`/exercise/${item.slug}`)}
          />
        ))}
      </SectionState>
    </Section>
  )
}

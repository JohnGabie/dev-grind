import { useNavigate } from 'react-router-dom'
import { statusWord, timeAgo } from '../format'
import ListRow from '../ListRow'
import { STATUS_COLOR } from '../palette'
import { rankColor } from '../rank'
import type { RecentExercise } from '../types'

const GLYPH: Record<string, string> = { passed: '✓', failed: '✗', in_progress: '◉' }

export function uniqueRecent(items: RecentExercise[], limit: number): RecentExercise[] {
  const seen = new Set<string>()
  return items.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, limit)
}

function Glyph({ status }: { status: string }) {
  const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? 'var(--muted)'
  return <span aria-hidden="true" style={{ color, fontSize: 'var(--fs-base)', flexShrink: 0, width: '1ch' }}>{GLYPH[status] ?? '◉'}</span>
}

export default function HistoryRows({ items }: { items: RecentExercise[] }) {
  const navigate = useNavigate()
  return (
    <>
      {items.map(item => (
        <ListRow
          key={item.id}
          lead={<Glyph status={item.status} />}
          tag={item.difficulty}
          tagColor={rankColor(item.difficulty)}
          title={item.title}
          meta={timeAgo(item.submitted_at)}
          ariaLabel={`${item.difficulty}, ${item.title}, ${statusWord(item.status)}, ${timeAgo(item.submitted_at)}`}
          onClick={() => navigate(`/exercise/${item.slug}`)}
        />
      ))}
    </>
  )
}

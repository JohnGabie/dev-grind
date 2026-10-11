import { useNavigate } from 'react-router-dom'
import { statusWord, timeAgo } from '../format'
import ListRow from '../ListRow'
import PromptLine from '../PromptLine'
import { STATUS_COLOR } from '../palette'
import { rankColor } from '../rank'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { RecentExercise } from '../types'
import WindowFrame from '../WindowFrame'

const GLYPH: Record<string, string> = { passed: '✓', failed: '✗', in_progress: '◉' }

function Glyph({ status }: { status: string }) {
  const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? 'var(--muted)'
  return <span aria-hidden="true" style={{ color, fontSize: 'var(--fs-base)', flexShrink: 0, width: '1ch' }}>{GLYPH[status] ?? '◉'}</span>
}

export default function HistorySection({ recent, user }: { recent: Slot<RecentExercise[]>; user: string }) {
  const navigate = useNavigate()
  const seen = new Set<string>()
  const items = (recent.data ?? []).filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 5)

  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <WindowFrame title="historico.log" ariaLabel="histórico" footer={{ language: 'Log', ln: 1 + Math.max(items.length, 1) }}>
        <PromptLine user={user} command="tail historico.log" cursor={false} />
        <div style={{ marginTop: 'var(--sp-2)' }}>
          <SectionState status={recent.status} empty={items.length === 0} emptyText="nada por aqui ainda" onRetry={recent.retry}>
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
          </SectionState>
        </div>
      </WindowFrame>
    </div>
  )
}

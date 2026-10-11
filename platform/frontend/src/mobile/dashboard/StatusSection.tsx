import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeBlock from '../CodeBlock'
import { shortDate } from '../format'
import { isInsightNew, readInsightOpenedAt } from '../insightSeen'
import { MARKDOWN_COLOR } from '../markdown'
import PromptLine from '../PromptLine'
import SectionState from '../SectionState'
import { buildStatusLines } from '../statusJson'
import type { Insight, UserStats } from '../types'
import type { Slot } from '../useSlot'
import WindowFrame from '../WindowFrame'
import StatusJson from './StatusJson'

const TABS = [{ id: 'status', label: 'status.json' }, { id: 'analysis', label: 'analise.md' }]
const PANEL_MIN_HEIGHT = 'calc(9 * var(--lh-base) * var(--fs-base))'
const EMPTY_PREVIEW_LINES = 1

interface Props { stats: Slot<UserStats>; insights: Slot<Insight[]>; user: string }

export default function StatusSection({ stats, insights, user }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('status')
  const [openedAt] = useState<string | null>(readInsightOpenedAt)
  const s = stats.data
  const latest = (insights.data ?? [])[0]
  const statusTab = tab === 'status'

  let body: ReactNode
  let lineCount = EMPTY_PREVIEW_LINES
  let language = 'JSON'

  if (statusTab) {
    if (stats.status !== 'ready' || !s) {
      body = <SectionState status={stats.status} onRetry={stats.retry}>{null}</SectionState>
    } else {
      const weekly = s.weekly_summary.completed_last_7_days
      const lines = buildStatusLines({
        rank: s.rank, honor: s.honor, honor_for_next_rank: s.honor_for_next_rank,
        rank_progress: s.rank_progress, current_streak: s.current_streak, weekly,
      })
      lineCount = lines.length + 2
      body = (
        <div
          role="button"
          tabIndex={0}
          aria-label={`status: ${s.rank}, ${s.honor} de honor, streak ${s.current_streak}, semana ${weekly}`}
          onClick={() => navigate('/profile')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/profile') } }}
          style={{ cursor: 'pointer' }}
        >
          <StatusJson lines={lines} />
        </div>
      )
    }
  } else {
    language = 'Markdown'
    if (insights.status !== 'ready' || !latest) {
      body = <SectionState status={insights.status} empty emptyText="sem análise ainda" onRetry={insights.retry}>{null}</SectionState>
    } else {
      const isNew = isInsightNew(latest.generated_at, openedAt)
      const rows = [
        <span style={{ color: MARKDOWN_COLOR.heading }}>{`# ${shortDate(latest.generated_at)}`}</span>,
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {latest.message.split('\n')[0]}
        </span>,
        ...(isNew ? [<span style={{ color: 'var(--cyan)' }}>● novo</span>] : []),
      ]
      lineCount = rows.length
      body = (
        <>
          <CodeBlock lines={rows} />
          <button
            type="button"
            aria-label="abrir análise do agente"
            onClick={() => navigate('/analysis')}
            style={{
              width: '100%', minHeight: 'var(--ctl-primary)', marginTop: 'var(--sp-2)', background: 'none', cursor: 'pointer',
              border: '1px solid var(--cyan)', borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
              fontFamily: 'var(--font)', fontSize: 'var(--fs-base)',
            }}
          >
            {'> ler análise'}
          </button>
        </>
      )
    }
  }

  return (
    <div style={{ marginTop: 'var(--sp-5)' }}>
      <WindowFrame
        title={statusTab ? 'status.json' : 'analise.md'}
        tabs={TABS}
        activeTab={tab}
        onTab={setTab}
        footer={{ language, ln: lineCount }}
      >
        <div style={{ marginBottom: 'var(--sp-2)' }}>
          <PromptLine user={user} command={statusTab ? 'cat status.json' : 'cat analise.md'} cursor={false} />
        </div>
        <div style={{ minHeight: PANEL_MIN_HEIGHT }}>{body}</div>
      </WindowFrame>
    </div>
  )
}

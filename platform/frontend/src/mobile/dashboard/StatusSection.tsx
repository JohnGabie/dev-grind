import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeBlock from '../CodeBlock'
import { shortDate } from '../format'
import { isInsightNew, readInsightOpenedAt } from '../insightSeen'
import { MARKDOWN_COLOR } from '../markdown'
import PromptLine from '../PromptLine'
import SectionState from '../SectionState'
import { buildStatusLines } from '../statusJson'
import type { Insight, RecentExercise, UserStats } from '../types'
import type { Slot } from '../useSlot'
import WindowFrame from '../WindowFrame'
import HistoryRows, { uniqueRecent } from './HistoryRows'
import StatusJson from './StatusJson'

const TABS = [{ id: 'status', label: 'status' }, { id: 'analysis', label: 'analise' }, { id: 'history', label: 'historico' }]
const FILE: Record<string, { name: string; command: string }> = {
  status: { name: 'status.json', command: 'cat status.json' },
  analysis: { name: 'analise.md', command: 'cat analise.md' },
  history: { name: 'historico.log', command: 'tail historico.log' },
}
const PANEL_MIN_HEIGHT = 'calc(9 * var(--lh-base) * var(--fs-base))'
const EMPTY_PREVIEW_LINES = 1
const PREVIEW_LINES = 5
const HISTORY_ROWS = 3

interface Props { stats: Slot<UserStats>; insights: Slot<Insight[]>; recent: Slot<RecentExercise[]>; user: string }

export default function StatusSection({ stats, insights, recent, user }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('status')
  const [previewLines, setPreviewLines] = useState(EMPTY_PREVIEW_LINES)
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
  } else if (tab === 'history') {
    language = 'Log'
    const items = uniqueRecent(recent.data ?? [], HISTORY_ROWS)
    lineCount = Math.max(items.length, 1)
    body = (
      <SectionState status={recent.status} empty={items.length === 0} emptyText="nada por aqui ainda" onRetry={recent.retry}>
        <HistoryRows items={items} />
      </SectionState>
    )
  } else {
    language = 'Markdown'
    if (insights.status !== 'ready' || !latest) {
      body = <SectionState status={insights.status} empty emptyText="sem análise ainda" onRetry={insights.retry}>{null}</SectionState>
    } else {
      const isNew = isInsightNew(latest.generated_at, openedAt)
      const rows = [
        <span>
          <span style={{ color: MARKDOWN_COLOR.heading }}>{`# ${shortDate(latest.generated_at)}`}</span>
          {isNew && <span style={{ color: 'var(--cyan)' }}>{'  ● novo'}</span>}
        </span>,
        <span style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: PREVIEW_LINES, overflow: 'hidden' }}>
          {latest.message.replace(/\s*\n+\s*/g, ' ')}
        </span>,
      ]
      lineCount = previewLines
      body = (
        <>
          <div style={{ flex: 1 }}><CodeBlock lines={rows} onLineCount={setPreviewLines} /></div>
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
        title={FILE[tab].name}
        tabs={TABS}
        activeTab={tab}
        onTab={setTab}
        footer={{ language, ln: lineCount }}
      >
        <div style={{ marginBottom: 'var(--sp-2)' }}>
          <PromptLine user={user} command={FILE[tab].command} cursor={false} />
        </div>
        <div style={{ minHeight: PANEL_MIN_HEIGHT, display: 'flex', flexDirection: 'column' }}>{body}</div>
      </WindowFrame>
    </div>
  )
}

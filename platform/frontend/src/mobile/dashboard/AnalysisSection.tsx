import { useState } from 'react'
import { isInsightNew } from '../insightSeen'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Insight } from '../types'

const KEY = 'insight_opened_at'

function readOpened(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function writeOpened(): void {
  try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* storage is unavailable */ }
}

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
const body = { fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap' } as const
const gapList = (gaps: unknown): string => (Array.isArray(gaps) ? gaps.join(' · ') : '')

export default function AnalysisSection({ insights }: { insights: Slot<Insight[]> }) {
  const [openedAt, setOpenedAt] = useState<string | null>(readOpened)
  const list = insights.data ?? []
  const latest = list[0]

  if (insights.status !== 'ready' || !latest) {
    return (
      <Section label="análise do agente">
        <SectionState status={insights.status} empty emptyText="sem análise ainda" onRetry={insights.retry}>{null}</SectionState>
      </Section>
    )
  }

  return (
    <Section
      label="análise do agente"
      summary={`${day(latest.generated_at)} · ${latest.message.split('\n')[0]}`}
      collapsible
      dot={isInsightNew(latest.generated_at, openedAt)}
      onToggle={open => { if (open) { writeOpened(); setOpenedAt(new Date().toISOString()) } }}
    >
      <p style={body}>{latest.message}</p>
      {gapList(latest.gaps) && (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', margin: 'var(--sp-3) 0 0' }}>
          {gapList(latest.gaps)}
        </p>
      )}
      {list.length > 1 && (
        <Section label="anteriores" collapsible>
          {list.slice(1).map(item => (
            <p key={item.generated_at} style={{ ...body, margin: '0 0 var(--sp-3)' }}>
              <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>{day(item.generated_at)} · </span>
              {item.message}
            </p>
          ))}
        </Section>
      )}
    </Section>
  )
}

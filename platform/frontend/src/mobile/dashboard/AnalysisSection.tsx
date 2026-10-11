import { useState, type ReactNode } from 'react'
import { isInsightNew } from '../insightSeen'
import PromptLine from '../PromptLine'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Insight } from '../types'
import WindowFrame from '../WindowFrame'

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

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <WindowFrame title="analise.log" titleColor="var(--yellow)" ariaLabel="análise do agente">{children}</WindowFrame>
    </div>
  )
}

export default function AnalysisSection({ insights, user }: { insights: Slot<Insight[]>; user: string }) {
  const [openedAt, setOpenedAt] = useState<string | null>(readOpened)
  const [open, setOpen] = useState(false)
  const list = insights.data ?? []
  const latest = list[0]
  const prompt = <PromptLine user={user} command="tail analise.log" commandColor="var(--yellow)" cursor={false} />

  if (insights.status !== 'ready' || !latest) {
    return (
      <Frame>
        {prompt}
        <div style={{ marginTop: 'var(--sp-2)' }}>
          <SectionState status={insights.status} empty emptyText="sem análise ainda" onRetry={insights.retry}>{null}</SectionState>
        </div>
      </Frame>
    )
  }

  const isNew = isInsightNew(latest.generated_at, openedAt)
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) { writeOpened(); setOpenedAt(new Date().toISOString()) }
  }

  return (
    <Frame>
      {prompt}
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        style={{
          width: '100%', minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font)', textAlign: 'left',
        }}
      >
        {isNew && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--cyan)', flexShrink: 0 }}>● novo</span>}
        {!open && (
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
            {`${day(latest.generated_at)} · ${latest.message.split('\n')[0]}`}
          </span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>
      {open && (
        <div>
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
        </div>
      )}
    </Frame>
  )
}

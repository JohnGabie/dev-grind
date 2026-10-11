import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { fetchInsights } from '../api'
import CodeBlock from '../CodeBlock'
import { promptUser, shortDate } from '../format'
import { writeInsightOpenedAt } from '../insightSeen'
import { MARKDOWN_COLOR, tokenizeMarkdownLine } from '../markdown'
import MobilePage from '../MobilePage'
import PromptLine from '../PromptLine'
import SectionState from '../SectionState'
import type { Insight } from '../types'
import { useSlot } from '../useSlot'
import WindowFrame from '../WindowFrame'

const list = (items: unknown): string[] => (Array.isArray(items) ? items.filter((i): i is string => typeof i === 'string' && i !== '') : [])

export function insightLines(item: Insight): string[] {
  const out = [`# ${shortDate(item.generated_at)}`, ...item.message.split('\n')]
  for (const [heading, items] of [['destaques', list(item.highlights)], ['lacunas', list(item.gaps)]] as const) {
    if (items.length === 0) continue
    out.push('', `## ${heading}`, ...items.map(i => `- ${i}`))
  }
  return out
}

export function analysisLines(insights: Insight[]): string[] {
  return insights.flatMap((item, i) => (i === 0 ? insightLines(item) : ['', '---', '', ...insightLines(item)]))
}

function renderLine(line: string) {
  return (
    <>
      {tokenizeMarkdownLine(line).map((t, i) => <span key={i} style={{ color: MARKDOWN_COLOR[t.kind] }}>{t.text}</span>)}
    </>
  )
}

export default function AnalysisMobile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const insights = useSlot(fetchInsights)
  const shellUser = promptUser(user?.name ?? '')
  const [visualLines, setVisualLines] = useState(1)
  const lines = analysisLines(insights.data ?? [])

  useEffect(() => { writeInsightOpenedAt() }, [])

  return (
    <MobilePage>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', padding: 0, marginBottom: 'var(--sp-2)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)',
          fontFamily: 'var(--font)', fontSize: 'var(--fs-base)',
        }}
      >
        ‹ voltar
      </button>
      <WindowFrame title="analise.md" ariaLabel="análise do agente" footer={{ language: 'Markdown', ln: lines.length === 0 ? 1 : visualLines }}>
        <div style={{ marginBottom: 'var(--sp-2)' }}>
          <PromptLine user={shellUser} command="cat analise.md" cursor={false} />
        </div>
        <SectionState status={insights.status} empty={lines.length === 0} emptyText="sem análise ainda" onRetry={insights.retry}>
          <CodeBlock lines={lines.map(renderLine)} onLineCount={setVisualLines} />
        </SectionState>
      </WindowFrame>
    </MobilePage>
  )
}

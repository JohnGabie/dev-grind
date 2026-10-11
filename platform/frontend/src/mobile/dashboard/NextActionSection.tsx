import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionCard from '../ActionCard'
import { distinctModeCount, pickModes, pickNextAction, type ModeKey } from '../nextAction'
import { MODE_COLOR } from '../palette'
import { rankColor } from '../rank'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Exercise, Resume } from '../types'

interface Props { resume: Slot<Resume | null>; exercises: Slot<Exercise[]> }

const MODES: ModeKey[] = ['rankup', 'warmup', 'practice']

export default function NextActionSection({ resume, exercises }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ModeKey>('rankup')

  const list = exercises.data ?? []
  const action = pickNextAction(resume.data, list, mode)
  const status = resume.status === 'loading' || (exercises.status === 'loading' && !action)
    ? 'loading'
    : !action && exercises.status === 'error' ? 'error' : 'ready'
  const showTabs = action?.kind === 'start' && distinctModeCount(list) >= 2
  const modes = pickModes(list)

  if (!action || status === 'loading') {
    return (
      <Section label="treinar agora">
        <SectionState
          status={status}
          empty
          emptyText="sem exercício por hoje"
          onRetry={() => { resume.retry(); exercises.retry() }}
        >{null}</SectionState>
      </Section>
    )
  }

  const resuming = action.kind === 'resume'
  const accent = resuming ? 'var(--cyan)' : MODE_COLOR[mode]

  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <div style={{ fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color: accent, marginBottom: 'var(--sp-2)' }}>
        <span style={{ color: 'var(--muted)' }}>$</span> {resuming ? 'continuar' : `treinar --modo ${mode}`}
      </div>
      {showTabs && (
        <div role="tablist" aria-label="modo" style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          {MODES.map(k => {
            const selected = k === mode
            const color = MODE_COLOR[k]
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={!modes[k]}
                onClick={() => setMode(k)}
                style={{
                  minHeight: 'var(--ctl-md)', display: 'flex', alignItems: 'center', background: 'none', border: 'none',
                  padding: 0, cursor: modes[k] ? 'pointer' : 'default', fontFamily: 'var(--font)', opacity: modes[k] ? 1 : 0.4,
                }}
              >
                <span style={{
                  minHeight: 'var(--ctl-chip)', display: 'inline-flex', alignItems: 'center', padding: '0 var(--sp-3)',
                  border: `1px solid ${selected ? color : 'var(--border)'}`, borderRadius: 'var(--radius-md)',
                  color: selected ? color : 'var(--muted)', fontSize: 'var(--fs-sm)', fontWeight: selected ? 700 : 400,
                }}>
                  {k}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <ActionCard
        eyebrow={resuming ? 'continuar' : 'treinar agora'}
        title={action.title}
        tag={action.difficulty}
        tagColor={rankColor(action.difficulty)}
        meta={action.progress ?? undefined}
        actionLabel={resuming ? 'continuar' : 'começar'}
        onAction={() => navigate(`/exercise/${action.slug}`)}
        accent={accent}
      />
    </div>
  )
}

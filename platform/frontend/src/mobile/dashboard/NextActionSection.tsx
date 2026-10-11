import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AsciiButton from './AsciiButton'
import { distinctModeCount, pickModes, pickNextAction, type ModeKey } from '../nextAction'
import PromptLine from '../PromptLine'
import { MODE_COLOR } from '../palette'
import { rankColor } from '../rank'
import Section from '../Section'
import SectionState from '../SectionState'
import WindowFrame from '../WindowFrame'
import type { Slot } from '../useSlot'
import type { Exercise, Resume } from '../types'

interface Props { resume: Slot<Resume | null>; exercises: Slot<Exercise[]>; user: string }

const MODES: ModeKey[] = ['rankup', 'warmup', 'practice']

export default function NextActionSection({ resume, exercises, user }: Props) {
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
      <WindowFrame title="treinar.sh" titleColor={accent}>
        <div style={{ marginBottom: 'var(--sp-2)' }}>
          <PromptLine user={user} command={resuming ? 'continuar' : `treinar --modo ${mode}`} commandColor={accent} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)' }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: rankColor(action.difficulty), flexShrink: 0 }}>{action.difficulty}</span>
          <span style={{ color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.title}</span>
        </div>
        <AsciiButton
          label={resuming ? 'continuar' : 'começar'}
          color={accent}
          onClick={() => navigate(`/exercise/${action.slug}`)}
        />
      </WindowFrame>
    </div>
  )
}

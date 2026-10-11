import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionCard from '../ActionCard'
import ListRow from '../ListRow'
import { MODE_LABEL, distinctModeCount, pickModes, pickNextAction, type ModeKey } from '../nextAction'
import { rankColor } from '../rank'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Exercise, Resume } from '../types'

interface Props { resume: Slot<Resume | null>; exercises: Slot<Exercise[]> }

export default function NextActionSection({ resume, exercises }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ModeKey>('rankup')
  const [picking, setPicking] = useState(false)

  const list = exercises.data ?? []
  const status = resume.status === 'loading' || exercises.status === 'loading'
    ? 'loading'
    : exercises.status === 'error' ? 'error' : 'ready'
  const action = pickNextAction(resume.data, list, mode)
  const canChoose = action?.kind === 'start' && distinctModeCount(list) >= 2
  const modes = pickModes(list)

  const chooser = canChoose && (
    <div style={{ marginTop: 'var(--sp-3)' }}>
      <button type="button" onClick={() => setPicking(p => !p)} style={{
        minHeight: 'var(--ctl-md)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--muted)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font)',
      }}>
        mudar modo
      </button>
      {picking && (['rankup', 'warmup', 'practice'] as ModeKey[]).filter(k => modes[k]).map(k => (
        <ListRow
          key={k}
          tag={modes[k]!.difficulty}
          tagColor={rankColor(modes[k]!.difficulty)}
          title={`${MODE_LABEL[k]} · ${modes[k]!.title}`}
          onClick={() => { setMode(k); setPicking(false) }}
        />
      ))}
    </div>
  )

  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <SectionState
        status={status}
        empty={!action}
        emptyText="sem exercício por hoje"
        onRetry={() => { resume.retry(); exercises.retry() }}
      >
        {action && (
          <ActionCard
            eyebrow={action.kind === 'resume' ? 'continuar' : 'treinar agora'}
            title={action.title}
            tag={action.difficulty}
            tagColor={rankColor(action.difficulty)}
            meta={action.progress ?? undefined}
            actionLabel={action.kind === 'resume' ? 'continuar' : 'começar'}
            onAction={() => navigate(`/exercise/${action.slug}`)}
            secondary={chooser || undefined}
          />
        )}
      </SectionState>
    </div>
  )
}

import PositionNumber from './PositionNumber'
import ProgressRing from './ProgressRing'
import SelectionMark from './SelectionMark'
import { selectableProps, selectModeAction, selectModeInert, type SelectProps } from '../lib/selectable'
import type { ListEntry } from '../lib/listEntry'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR, percentOf } from '../lib/courseDisplay'

export default function CourseGalleryTile({ entry, onOpen, onAction, selectMode = false, selected = false, onToggle }: { entry: ListEntry; onOpen: () => void; onAction: () => void } & SelectProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  const percent = percentOf(done, total)
  const size = isMobile ? 'var(--fs-base)' : undefined
  const pick = selectableProps({ title: entry.title, selectMode, selected, onToggle, onOpen })
  const inert = selectMode ? selectModeInert : undefined
  return (
    <div
      className="card"
      {...pick.props}
      style={{ minWidth: 0, padding: '20px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12, ...pick.style }}
    >
      {selectMode && <SelectionMark selected={selected} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ProgressRing percent={percent} complete={state === 'concluído'} label={`${entry.title}: ${percent}%`} />
        <button
          type="button"
          tabIndex={selectMode ? -1 : undefined}
          style={{ ...inert, flex: 1, minWidth: 0, minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-lg)' : 18, overflowWrap: 'anywhere' }}
        >
          <PositionNumber position={entry.position} />{entry.title}
        </button>
      </div>
      {entry.description && (
        <span style={{ color: 'var(--muted)', fontSize: size, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{entry.description}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: size }}>
          <span>{detail ? detail + ' · ' : ''}{done} de {total} lições</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
        {entry.action && (
          <button
            type="button"
            disabled={selectMode}
            aria-hidden={selectMode || undefined}
            onClick={e => { e.stopPropagation(); onAction() }}
            style={{ background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap', ...(selectMode ? selectModeAction : undefined) }}
          >
            {entry.action}
          </button>
        )}
      </div>
    </div>
  )
}

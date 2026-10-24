import PositionNumber from './PositionNumber'
import SelectionMark from './SelectionMark'
import { selectableProps, selectModeInert, type SelectProps } from '../lib/selectable'
import type { ListEntry } from '../lib/listEntry'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import ProgressBar from './ProgressBar'

export default function CourseRow({ entry, onOpen, selectMode = false, selected = false, onToggle }: { entry: ListEntry; onOpen: () => void } & SelectProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  const pick = selectableProps({ title: entry.title, selectMode, selected, onToggle, onOpen })
  const inert = selectMode ? selectModeInert : undefined
  return (
    <div
      className="card course-item"
      {...pick.props}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', cursor: 'pointer', boxSizing: 'border-box', ...pick.style }}
    >
      {selectMode && <SelectionMark selected={selected} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button" className="course-item__open"
          tabIndex={selectMode ? -1 : undefined}
          style={{ ...inert, display: 'block', width: '100%', minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-lg)' : 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          <PositionNumber position={entry.position} />{entry.title}
        </button>
        <div style={{ margin: '6px 0' }}>
          <ProgressBar done={done} total={total} label={`${entry.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
        </div>
        <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12 }}>
          <span>{detail ? detail + ' · ' : ''}{done}/{total}</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
      </div>
    </div>
  )
}

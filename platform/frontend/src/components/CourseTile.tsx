import PositionNumber from './PositionNumber'
import SelectionMark from './SelectionMark'
import { selectableProps, selectModeInert, type SelectProps } from '../lib/selectable'
import type { ListEntry } from '../lib/listEntry'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import ProgressBar from './ProgressBar'

export default function CourseTile({ entry, onOpen, selectMode = false, selected = false, onToggle }: { entry: ListEntry; onOpen: () => void } & SelectProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  const pick = selectableProps({ title: entry.title, selectMode, selected, onToggle, onOpen })
  const inert = selectMode ? selectModeInert : undefined
  return (
    <div
      className="card"
      {...pick.props}
      style={{ minWidth: 0, padding: '12px 14px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8, ...pick.style }}
    >
      {selectMode && <SelectionMark selected={selected} />}
      <button
        type="button"
        tabIndex={selectMode ? -1 : undefined}
        style={{ ...inert, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-base)' : 14, overflowWrap: 'anywhere' }}
      >
        <PositionNumber position={entry.position} />{entry.title}
      </button>
      <ProgressBar done={done} total={total} label={`${entry.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: STATE_COLOR[state] }}>{detail ? detail + ' · ' : ''}{done}/{total}</span>
    </div>
  )
}

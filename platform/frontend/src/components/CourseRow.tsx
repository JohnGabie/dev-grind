import PositionNumber from './PositionNumber'
import type { ListEntry } from '../lib/listEntry'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import ProgressBar from './ProgressBar'

export default function CourseRow({ entry, onOpen, onAction }: { entry: ListEntry; onOpen: () => void; onAction: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', cursor: 'pointer', boxSizing: 'border-box' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          style={{ display: 'block', width: '100%', minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-lg)' : 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onAction() }}
        style={{ background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap' }}
      >
        {entry.action}
      </button>
    </div>
  )
}

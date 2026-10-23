import type { ListEntry } from '../lib/listEntry'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import ProgressBar from './ProgressBar'

export default function CourseTile({ entry, onOpen }: { entry: ListEntry; onOpen: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ minWidth: 0, padding: '12px 14px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <button
        type="button"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-base)' : 14, overflowWrap: 'anywhere' }}
      >
        {entry.position != null && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{entry.position}. </span>}{entry.title}
      </button>
      <ProgressBar done={done} total={total} label={`${entry.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: STATE_COLOR[state] }}>{detail ? detail + ' · ' : ''}{done}/{total}</span>
    </div>
  )
}

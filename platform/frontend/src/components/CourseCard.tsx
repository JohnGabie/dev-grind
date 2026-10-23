import type { ListEntry } from '../lib/listEntry'
import { STATE_COLOR } from '../lib/courseDisplay'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

export default function CourseCard({ entry, onOpen, onAction }: { entry: ListEntry; onOpen: () => void; onAction: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state, detail } = entry
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <div className="card" onClick={onOpen} style={{ width: '100%', boxSizing: 'border-box', padding: '18px 20px', cursor: 'pointer' }}>
      <button
        type="button"
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ display: 'block', fontSize: isMobile ? 'var(--fs-lg)' : 18, fontWeight: 700, marginBottom: 6 }}>{entry.position != null && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{entry.position}. </span>}{entry.title}</span>
        {entry.description && <span style={{ display: 'block', color: 'var(--muted)', marginBottom: 8, fontSize: size }}>{entry.description}</span>}
      </button>
      <div
        role="progressbar"
        aria-label={`${entry.title}: ${done} de ${total} lições`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }}
      >
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 4, background: state === 'concluído' ? 'var(--green)' : 'var(--cyan)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: size }}>
          <span style={{ color: 'var(--text)' }}>{detail ? detail + ' · ' : ''}{done} de {total} lições</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onAction() }}
          style={{
            background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap',
          }}
        >
          {entry.action}
        </button>
      </div>
    </div>
  )
}

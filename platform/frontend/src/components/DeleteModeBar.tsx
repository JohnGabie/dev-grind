import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

interface Props {
  active: boolean
  count: number
  empty: boolean
  busy?: boolean
  fill?: boolean
  onEnter: () => void
  onExit: () => void
  onDelete: () => void
}

export default function DeleteModeBar({ active, count, empty, busy = false, fill = false, onEnter, onExit, onDelete }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const height = 'var(--ctl-md)'
  const base = {
    boxSizing: 'border-box' as const,
    height,
    fontFamily: 'inherit',
    fontSize: isMobile ? 'var(--fs-base)' : 'var(--fs-sm)',
    borderRadius: 'var(--radius-lg)',
    whiteSpace: 'nowrap' as const,
    background: 'none',
    flex: fill ? 1 : undefined,
    marginRight: fill ? undefined : 'var(--sp-1)',
  }

  if (!active) {
    return (
      <button
        type="button"
        aria-label="modo apagar"
        disabled={empty}
        onClick={onEnter}
        style={{ ...base, width: height, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginRight: 0, marginBottom: -1, border: '1px solid transparent', color: 'var(--red)', cursor: empty ? 'not-allowed' : 'pointer', opacity: empty ? 0.4 : 1 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
        </svg>
      </button>
    )
  }

  const blocked = count === 0 || busy
  return (
    <>
      <button
        type="button"
        disabled={blocked}
        onClick={onDelete}
        style={{ ...base, padding: '0 var(--sp-3)', border: '1px solid var(--red)', color: 'var(--red)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.5 : 1 }}
      >
        apagar{count > 0 ? ` ${count}` : ''}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onExit}
        style={{ ...base, padding: '0 var(--sp-3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
      >
        sair do modo
      </button>
    </>
  )
}

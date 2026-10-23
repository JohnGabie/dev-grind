import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

interface Props {
  count: number
  busy?: boolean
  onExit: () => void
  onDelete: () => void
}

export default function DeleteModeBar({ count, busy = false, onExit, onDelete }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const base = {
    boxSizing: 'border-box' as const,
    height: 'var(--ctl-md)',
    padding: '0 var(--sp-3)',
    fontFamily: 'inherit',
    fontSize: isMobile ? 'var(--fs-base)' : 'var(--fs-sm)',
    borderRadius: 'var(--radius-lg)',
    whiteSpace: 'nowrap' as const,
    marginBottom: isMobile ? -1 : undefined,
  }

  const armed = count > 0
  const blocked = !armed || busy
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onExit}
        style={{ ...base, marginRight: 'var(--sp-1)', background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
      >
        sair do modo
      </button>
      <button
        type="button"
        disabled={blocked}
        onClick={onDelete}
        style={armed
          ? { ...base, background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--bg)', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }
          : { ...base, background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'not-allowed' }}
      >
        apagar{armed ? ` ${count}` : ''}
      </button>
    </>
  )
}

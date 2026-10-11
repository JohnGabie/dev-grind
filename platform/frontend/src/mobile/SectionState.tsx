import type { ReactNode } from 'react'
import type { SlotStatus } from './useSlot'

interface SectionStateProps {
  status: SlotStatus
  empty?: boolean
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

const muted = { fontSize: 'var(--fs-sm)', color: 'var(--muted)', fontFamily: 'var(--font)' } as const

export default function SectionState({ status, empty = false, emptyText = 'nada por aqui ainda', onRetry, children }: SectionStateProps) {
  if (status === 'loading') return <span style={muted}>_</span>
  if (status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span style={muted}>não foi possível carregar</span>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{
            minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', cursor: 'pointer',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)',
          }}>
            tentar de novo
          </button>
        )}
      </div>
    )
  }
  if (empty) return <span style={muted}>{emptyText}</span>
  return <>{children}</>
}

import type { KeyboardEvent, ReactNode } from 'react'

interface WindowFrameProps {
  title: string
  children: ReactNode
  onClick?: () => void
  ariaLabel?: string
}

export default function WindowFrame({ title, children, onClick, ariaLabel }: WindowFrameProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() }
  }
  return (
    <div
      role={onClick ? 'button' : ariaLabel ? 'group' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onClick ? onKeyDown : undefined}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        cursor: onClick ? 'pointer' : 'default', overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'var(--ctl-chip)',
          padding: '0 var(--sp-3)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: 'var(--fs-sm)',
        }}
      >
        <span style={{ color: 'var(--text)' }}>{title}</span>
        <span aria-hidden="true" style={{ whiteSpace: 'pre', color: 'var(--muted)' }}>_  □  X</span>
      </div>
      <div style={{ padding: 'var(--sp-3)' }}>{children}</div>
    </div>
  )
}

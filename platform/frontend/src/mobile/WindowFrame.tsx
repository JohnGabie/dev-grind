import type { KeyboardEvent, ReactNode } from 'react'

interface WindowFrameProps {
  title: string
  titleColor: string
  children: ReactNode
  onClick?: () => void
  ariaLabel?: string
}

export default function WindowFrame({ title, titleColor, children, onClick, ariaLabel }: WindowFrameProps) {
  const onKeyDown = (e: KeyboardEvent) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }
  return (
    <div
      role={onClick ? 'button' : undefined}
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'var(--ctl-md)',
          padding: '0 var(--sp-3)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: 'var(--fs-sm)',
        }}
      >
        <span style={{ color: titleColor }}>{title}</span>
        <span aria-hidden="true" style={{ whiteSpace: 'pre' }}>
          <span style={{ color: 'var(--yellow)' }}>_</span>{'  '}
          <span style={{ color: 'var(--green)' }}>□</span>{'  '}
          <span style={{ color: 'var(--red)' }}>X</span>
        </span>
      </div>
      <div style={{ padding: 'var(--sp-3)' }}>{children}</div>
    </div>
  )
}

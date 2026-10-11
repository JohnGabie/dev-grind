import type { KeyboardEvent, ReactNode } from 'react'

interface SurfaceProps { children: ReactNode; onClick?: () => void; label?: string }

export default function Surface({ children, onClick, label }: SurfaceProps) {
  const onKeyDown = (e: KeyboardEvent) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={onClick ? onKeyDown : undefined}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-4)', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  )
}

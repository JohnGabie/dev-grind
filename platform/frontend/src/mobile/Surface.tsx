import type { KeyboardEvent, ReactNode } from 'react'

interface SurfaceProps { children: ReactNode; onClick?: () => void }

export default function Surface({ children, onClick }: SurfaceProps) {
  const onKeyDown = (e: KeyboardEvent) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
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

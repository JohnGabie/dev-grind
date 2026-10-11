import type { ReactNode } from 'react'
import Surface from './Surface'

interface ActionCardProps {
  eyebrow: string
  title: string
  tag?: string
  tagColor?: string
  meta?: string
  actionLabel: string
  onAction: () => void
  secondary?: ReactNode
}

export default function ActionCard({ eyebrow, title, tag, tagColor, meta, actionLabel, onAction, secondary }: ActionCardProps) {
  return (
    <Surface>
      <span className="section-label">{eyebrow}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
        {tag && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: tagColor ?? 'var(--muted)', flexShrink: 0 }}>{tag}</span>}
        <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      </div>
      {meta && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginTop: 'var(--sp-1)' }}>{meta}</div>}
      <button
        type="button"
        onClick={onAction}
        style={{
          width: '100%', minHeight: 'var(--ctl-primary)', marginTop: 'var(--sp-4)', cursor: 'pointer',
          background: 'var(--cyan-faint)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 'var(--radius-md)',
          color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontWeight: 600, fontFamily: 'var(--font)',
        }}
      >
        {actionLabel}
      </button>
      {secondary}
    </Surface>
  )
}

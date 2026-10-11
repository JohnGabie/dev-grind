import { useState, type ReactNode } from 'react'

interface SectionProps {
  label: ReactNode
  summary?: string              // one line shown next to the label while collapsed
  collapsible?: boolean
  defaultOpen?: boolean
  onToggle?: (open: boolean) => void
  children: ReactNode
}

export default function Section({ label, summary, collapsible = false, defaultOpen = false, onToggle, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const head = (
    <>
      <span className="section-label">{label}</span>
      {summary && !open && (
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
          {summary}
        </span>
      )}
      {collapsible && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )}
    </>
  )

  if (!collapsible) {
    return (
      <section style={{ marginTop: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>{head}</div>
        {children}
      </section>
    )
  }

  return (
    <section style={{ marginTop: 'var(--sp-6)', borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { const next = !open; setOpen(next); onToggle?.(next) }}
        style={{
          width: '100%', minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font)', textAlign: 'left',
        }}
      >
        {head}
      </button>
      {open && <div style={{ paddingBottom: 'var(--sp-3)' }}>{children}</div>}
    </section>
  )
}

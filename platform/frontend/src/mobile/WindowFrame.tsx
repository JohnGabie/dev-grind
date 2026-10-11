import type { KeyboardEvent, ReactNode } from 'react'

export interface WindowTab { id: string; label: string }

interface WindowFrameProps {
  title: string
  children: ReactNode
  onClick?: () => void
  ariaLabel?: string
  tabs?: WindowTab[]
  activeTab?: string
  onTab?: (id: string) => void
  footer?: { language: string; ln?: number }
}

const DOTS = ['var(--red)', 'var(--yellow)', 'var(--green)']

export default function WindowFrame({ title, children, onClick, ariaLabel, tabs, activeTab, onTab, footer }: WindowFrameProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() }
  }
  return (
    <div
      role={onClick ? 'button' : ariaLabel ? 'group' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onClick ? onKeyDown : undefined}
      style={{
        background: 'var(--editor)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        cursor: onClick ? 'pointer' : 'default', overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', height: 'var(--ctl-chip)',
          padding: '0 var(--sp-3)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: 'var(--fs-sm)',
        }}
      >
        <span aria-hidden="true" style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
          {DOTS.map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: 'var(--radius-pill)', background: c }} />)}
        </span>
        {tabs ? (
          <div role="tablist" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {tabs.map(t => {
              const active = t.id === activeTab
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={e => { e.stopPropagation(); onTab?.(t.id) }}
                  style={{
                    height: 'var(--ctl-md)', display: 'flex', alignItems: 'center', background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 'var(--fs-sm)',
                  }}
                >
                  <span style={{
                    height: 'var(--ctl-chip)', display: 'inline-flex', alignItems: 'center', padding: '0 var(--sp-3)',
                    color: active ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', boxSizing: 'border-box',
                    borderBottom: `2px solid ${active ? 'var(--cyan)' : 'transparent'}`,
                  }}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <span style={{ flex: 1, minWidth: 0, textAlign: 'center', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 'calc(10px * 3 + var(--sp-2) * 2)' }}>
            {title}
          </span>
        )}
      </div>
      <div style={{ padding: 'var(--sp-3)' }}>{children}</div>
      {footer && (
        <div style={{
          display: 'flex', gap: 'var(--sp-3)', padding: 'var(--sp-1) var(--sp-3)', borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font)', fontSize: 'var(--fs-xs)', color: 'var(--muted)', whiteSpace: 'pre',
        }}>
          <span style={{ color: 'var(--cyan)' }}>{footer.language}</span>
          <span>UTF-8</span>
          <span>{`Ln ${footer.ln ?? 1}, Col 1`}</span>
        </div>
      )}
    </div>
  )
}

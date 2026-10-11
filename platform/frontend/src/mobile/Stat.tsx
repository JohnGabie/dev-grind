import { Children, type ReactNode } from 'react'

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)', lineHeight: 'var(--lh-lg)' }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginTop: 'var(--sp-1)' }}>{label}</div>
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', marginTop: 'var(--sp-4)' }}>
      {Children.toArray(children).map((child, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, borderLeft: i === 0 ? 'none' : '1px solid var(--border)' }}>{child}</div>
      ))}
    </div>
  )
}

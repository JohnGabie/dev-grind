import type { ReactNode } from 'react'

export default function CodeBlock({ lines }: { lines: ReactNode[] }) {
  const digits = String(lines.length).length
  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)' }}>
      {lines.map((content, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <span aria-hidden="true" style={{
            width: `${digits}ch`, flexShrink: 0, textAlign: 'right', color: 'var(--muted)', userSelect: 'none',
          }}>
            {i + 1}
          </span>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text)' }}>
            {content}
          </span>
        </div>
      ))}
    </div>
  )
}

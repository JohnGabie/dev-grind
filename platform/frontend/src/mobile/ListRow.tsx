import type { ReactNode } from 'react'

interface ListRowProps {
  lead?: ReactNode
  tag?: string
  tagColor?: string
  title: string
  meta?: string
  onClick?: () => void
}

export default function ListRow({ lead, tag, tagColor, title, meta, onClick }: ListRowProps) {
  const style = {
    width: '100%', minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
    background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: 0,
    color: 'inherit', fontFamily: 'var(--font)', textAlign: 'left' as const, cursor: onClick ? 'pointer' : 'default',
  }
  const body = (
    <>
      {lead}
      {tag && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: tagColor ?? 'var(--muted)', flexShrink: 0, minWidth: 36 }}>{tag}</span>}
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-base)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {meta && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', flexShrink: 1, minWidth: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>}
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} style={style}>{body}</button>
    : <div style={style}>{body}</div>
}

import type { ReactNode } from 'react'
import CodeBlock from '../CodeBlock'
import type { StatusLine } from '../statusJson'

const punct = 'var(--muted)'

export function statusJsonRows(lines: StatusLine[]): ReactNode[] {
  const rows: ReactNode[] = [<span style={{ color: punct }}>{'{'}</span>]
  for (const line of lines) {
    const isString = typeof line.value === 'string'
    const valueColor = line.color ?? (isString ? 'var(--green)' : 'var(--orange)')
    rows.push(
      <>
        <span style={{ color: punct }}>{'  "'}</span>
        <span style={{ color: 'var(--blue-soft)' }}>{line.key}</span>
        <span style={{ color: punct }}>{'": '}</span>
        {isString
          ? <span style={{ color: valueColor }}><span style={{ color: punct }}>"</span>{line.value}<span style={{ color: punct }}>"</span></span>
          : <span style={{ color: valueColor }}>{line.value}</span>}
        {line.comma && <span style={{ color: punct }}>,</span>}
      </>,
    )
  }
  rows.push(<span style={{ color: punct }}>{'}'}</span>)
  return rows
}

export default function StatusJson({ lines }: { lines: StatusLine[] }) {
  return <div aria-hidden="true"><CodeBlock lines={statusJsonRows(lines)} /></div>
}

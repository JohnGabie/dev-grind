import type { StatusLine } from '../statusJson'

const syntax = { color: 'var(--muted)' } as const

export default function StatusJson({ lines }: { lines: StatusLine[] }) {
  return (
    <pre
      aria-hidden="true"
      style={{
        margin: 0, fontFamily: 'var(--font)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)',
        whiteSpace: 'pre', overflow: 'hidden',
      }}
    >
      <span style={syntax}>{'{'}</span>
      {lines.map(line => (
        <div key={line.key}>
          <span style={syntax}>{'  "'}</span><span style={syntax}>{line.key}</span><span style={syntax}>{'": '}</span>
          {typeof line.value === 'string'
            ? <span style={{ color: line.color }}><span style={syntax}>"</span>{line.value}<span style={syntax}>"</span></span>
            : <span style={{ color: line.color }}>{line.value}</span>}
          {line.comma && <span style={syntax}>,</span>}
        </div>
      ))}
      <span style={syntax}>{'}'}</span>
    </pre>
  )
}

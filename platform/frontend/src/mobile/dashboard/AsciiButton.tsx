const INNER = 22

function box(label: string) {
  const text = `> ${label}`
  const left = Math.floor((INNER - text.length) / 2)
  const middle = ' '.repeat(left) + text + ' '.repeat(INNER - text.length - left)
  const edge = `+${'-'.repeat(INNER)}+`
  return `${edge}\n|${middle}|\n${edge}`
}

export default function AsciiButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: 'var(--ctl-primary)',
        marginTop: 'var(--sp-2)', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color,
      }}
    >
      <span aria-hidden="true" style={{ display: 'block', whiteSpace: 'pre' }}>{box(label)}</span>
    </button>
  )
}

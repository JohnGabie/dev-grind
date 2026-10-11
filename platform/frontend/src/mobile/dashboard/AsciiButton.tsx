const INNER = 22

function box(label: string) {
  const text = `> ${label}`
  const left = Math.floor((INNER - text.length) / 2)
  const middle = ' '.repeat(left) + text + ' '.repeat(INNER - text.length - left)
  return `╔${'═'.repeat(INNER)}╗\n║${middle}║\n╚${'═'.repeat(INNER)}╝`
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
      <pre aria-hidden="true" style={{ margin: 0, font: 'inherit', lineHeight: 'inherit', color: 'inherit', whiteSpace: 'pre' }}>{box(label)}</pre>
    </button>
  )
}

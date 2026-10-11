export default function GreetingHeader({ name }: { name: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite'
  const firstName = name.split(' ')[0] ?? ''
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
      <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', lineHeight: 'var(--lh-xl)' }}>
        {greeting},{' '}
        <span style={{ color: 'var(--cyan)' }}>{firstName}</span>
      </h1>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--blue)', flexShrink: 0 }}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    </div>
  )
}

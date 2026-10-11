export default function GuildPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-4)', color: 'var(--muted)' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
      </svg>
      <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text)', opacity: 0.5 }}>Guilda</span>
      <span style={{ fontSize: 'var(--fs-base)' }}>Em desenvolvimento</span>
    </div>
  )
}

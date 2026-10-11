export default function BrandRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minHeight: 'var(--ctl-chip)', marginBottom: 'var(--sp-2)' }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
        <path d="M16 3L29 10V22L16 29L3 22V10Z" stroke="var(--cyan)" strokeWidth="1.5" fill="var(--cyan-faint)" />
        <path d="M16 3V29M3 10L29 22M29 10L3 22" stroke="var(--cyan)" strokeWidth="0.5" opacity="0.4" />
      </svg>
      <span style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>DevGrind</span>
    </div>
  )
}

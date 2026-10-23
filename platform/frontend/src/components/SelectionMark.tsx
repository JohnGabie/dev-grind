export default function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute', top: 'calc(var(--sp-2) * -1)', left: 'calc(var(--sp-2) * -1)', zIndex: 1, boxSizing: 'border-box', width: 'var(--sp-6)', height: 'var(--sp-6)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? 'var(--red)' : 'var(--bg)',
        border: `2px solid ${selected ? 'var(--red)' : 'var(--muted)'}`,
        color: 'var(--bg)',
      }}
    >
      {selected && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  )
}

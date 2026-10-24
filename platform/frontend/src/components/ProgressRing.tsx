const RADIUS = 26
const CIRC = 2 * Math.PI * RADIUS

export default function ProgressRing({ percent, complete, label }: { percent: number; complete: boolean; label: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={RADIUS} strokeWidth="6" style={{ fill: 'none', stroke: 'rgba(255,255,255,0.12)' }} />
      {percent > 0 && (
        <circle
          cx="32" cy="32" r={RADIUS} strokeWidth="6" strokeLinecap="round"
          style={{ fill: 'none', stroke: complete ? 'var(--green)' : 'var(--cyan)' }}
          strokeDasharray={`${(CIRC * percent) / 100} ${CIRC}`}
          transform="rotate(-90 32 32)"
        />
      )}
      <text x="32" y="36" textAnchor="middle" fontSize="13" style={{ fontFamily: 'var(--font)', fill: 'var(--text)' }}>{percent}%</text>
    </svg>
  )
}

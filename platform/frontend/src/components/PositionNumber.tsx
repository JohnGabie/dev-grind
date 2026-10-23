export default function PositionNumber({ position }: { position?: number }) {
  if (position == null) return null
  return <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 'var(--fs-sm)' }}>{position}. </span>
}

interface PromptLineProps {
  user: string
  command: string
  commandColor?: string
  cursor?: boolean
}

export default function PromptLine({ user, command, commandColor = 'var(--text)', cursor = true }: PromptLineProps) {
  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ color: 'var(--green)' }}>{user}@devgrind</span>
      <span style={{ color: 'var(--muted)' }}>:</span>
      <span style={{ color: 'var(--blue)' }}>~</span>
      <span style={{ color: 'var(--cyan)' }}>$</span>{' '}
      <span style={{ color: commandColor }}>{command}{cursor && <span aria-hidden="true">█</span>}</span>
    </div>
  )
}

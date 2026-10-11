import { useMediaQuery } from '../hooks/useMediaQuery'
import { NARROW_QUERY } from './screen'

interface PromptLineProps {
  user: string
  command: string
  commandColor?: string
  cursor?: boolean
}

export default function PromptLine({ user, command, commandColor = 'var(--cyan)', cursor = true }: PromptLineProps) {
  const narrow = useMediaQuery(NARROW_QUERY)
  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: narrow ? 'var(--fs-sm)' : 'var(--fs-base)', lineHeight: 'var(--lh-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ color: 'var(--text)' }}>{user}@devgrind</span>
      <span style={{ color: 'var(--muted)' }}>:~</span>
      <span style={{ color: 'var(--cyan)' }}>$</span>{' '}
      <span style={{ color: commandColor }}>{command}{cursor && <span aria-hidden="true" style={{ color: 'var(--cyan)' }}>█</span>}</span>
    </div>
  )
}

import type { Course } from '../lib/courseModel'
import { courseProgress } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import ProgressBar from './ProgressBar'

export default function CourseTile({ course, onOpen }: { course: Course; onOpen: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state } = courseProgress(course)
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ minWidth: 0, padding: '12px 14px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <button
        type="button"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', minHeight: isMobile ? 'var(--ctl-md)' : undefined, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-base)' : 14, overflowWrap: 'anywhere' }}
      >
        {course.title}
      </button>
      <ProgressBar done={done} total={total} label={`${course.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: STATE_COLOR[state] }}>{done}/{total}</span>
    </div>
  )
}

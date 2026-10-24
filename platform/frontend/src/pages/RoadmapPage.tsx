import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CourseNotFound from '../components/CourseNotFound'
import ProgressBar from '../components/ProgressBar'
import RoadmapTrail from '../components/RoadmapTrail'
import { useCourseData } from '../hooks/useCourseData'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import { actionLabel } from '../lib/courseProgress'
import { pagePadding } from '../lib/layout'
import { roadmapCourses, roadmapProgress, roadmapTarget } from '../lib/roadmapModel'
import { trailStages } from '../lib/roadmapTrail'

const ROADMAPS_TAB = '/courses?tab=roadmaps'

export default function RoadmapPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const navigate = useNavigate()
  const { roadmapId } = useParams()
  const { roadmaps, byId, loading, error, roadmapsError, reload } = useCourseData()

  const roadmap = roadmaps.find(item => item.id === roadmapId) ?? null
  const loadError = error ?? roadmapsError
  const base = isMobile ? 'var(--fs-base)' : undefined

  const shell = (children: ReactNode) => (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: pagePadding('40px 48px 72px', isMobile, true) }}>
        {children}
      </div>
    </div>
  )

  if (loading) return shell(<p style={{ color: 'var(--muted)', fontSize: base }}>Carregando…</p>)

  if (loadError) {
    return shell(
      <div>
        <p style={{ color: 'var(--muted)' }}>{loadError}</p>
        <button onClick={reload} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', padding: '0 14px', minHeight: 'var(--ctl-md)' }}>
          tentar de novo
        </button>
      </div>,
    )
  }

  if (!roadmap) return shell(<CourseNotFound text="roadmap não encontrado" to={ROADMAPS_TAB} linkText="← roadmaps" />)

  const { courses: count, done, total, state } = roadmapProgress(roadmap, byId)
  const members = roadmapCourses(roadmap, byId)
  const target = roadmapTarget(roadmap, byId)
  const action = actionLabel(state)

  const onMainAction = () => {
    if (target) return navigate(target.lessonKey ? `/courses/${target.courseId}/${target.lessonKey}` : `/courses/${target.courseId}`)
    if (members.length > 0) navigate(`/courses/${members[0].id}`)
  }

  const ghost = { background: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: base, padding: '0 14px', minHeight: 'var(--ctl-md)', boxSizing: 'border-box' as const }

  return shell(
    <>
      <Link to={ROADMAPS_TAB} style={{ color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', minHeight: 'var(--ctl-md)', fontSize: base }}>
        ← roadmaps
      </Link>
      <h1 style={{ fontSize: isMobile ? 'var(--fs-xl)' : 32, margin: '4px 0 8px', overflowWrap: 'anywhere' }}>{roadmap.title}</h1>
      {roadmap.description && <p style={{ color: 'var(--muted)', fontSize: base, margin: '0 0 12px', overflowWrap: 'anywhere' }}>{roadmap.description}</p>}
      <div style={{ margin: '0 0 var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
          <p style={{ fontSize: base, margin: 0 }}>
            {count === 1 ? '1 curso' : `${count} cursos`} · {done} de {total} lições
            <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
          </p>
          {members.length > 0 && (
            <button type="button" onClick={onMainAction} style={{ ...ghost, border: '1px solid var(--cyan)', color: 'var(--cyan)' }}>
              {action}
            </button>
          )}
        </div>
        <ProgressBar done={done} total={total} label={`${roadmap.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      </div>

      {members.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: base, margin: '16px 0 0' }}>Roadmap vazio. A IA adiciona cursos aqui.</p>
      ) : (
        <RoadmapTrail stages={trailStages(roadmap, byId)} onContinue={onMainAction} />
      )}
    </>,
  )
}

import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CourseNotFound from '../components/CourseNotFound'
import RoadmapTrail from '../components/RoadmapTrail'
import { useCourseData } from '../hooks/useCourseData'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import { actionLabel } from '../lib/courseProgress'
import { MOBILE_TOP_INSET, pagePadding } from '../lib/layout'
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

  const onMainAction = () => {
    if (target) return navigate(target.lessonKey ? `/courses/${target.courseId}/${target.lessonKey}` : `/courses/${target.courseId}`)
    if (members.length > 0) navigate(`/courses/${members[0].id}`)
  }

  return shell(
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        margin: '0 0 var(--sp-2)', padding: `${isMobile ? MOBILE_TOP_INSET : 'var(--sp-4)'} 0 var(--sp-4)`,
      }}>
        <button
          type="button"
          onClick={() => navigate(ROADMAPS_TAB)}
          style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: isMobile ? 0 : 'var(--sp-3)', display: isMobile ? 'inline-flex' : undefined, alignItems: isMobile ? 'center' : undefined, minHeight: isMobile ? 'var(--ctl-md)' : undefined, fontSize: base }}
        >
          ← roadmaps
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <h1 style={{ fontSize: isMobile ? 'var(--fs-xl)' : 28, margin: '0 0 var(--sp-1)', overflowWrap: 'anywhere' }}>{roadmap.title}</h1>
          <p style={{ fontSize: base, margin: 0, overflowWrap: 'anywhere' }}>
            {count === 1 ? '1 curso' : `${count} cursos`} · {done} de {total} lições
            <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
          </p>
        </div>
        {members.length > 0 && (
          <button
            type="button"
            onClick={onMainAction}
            style={{
              background: 'var(--cyan)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: base, padding: '0 var(--sp-6)', minHeight: 'var(--ctl-primary)',
              boxSizing: 'border-box', flex: isMobile ? '1 1 100%' : '0 0 auto',
            }}
          >
            {actionLabel(state)}
          </button>
        )}
        </div>
      </div>
      {roadmap.description && <p style={{ color: 'var(--muted)', fontSize: base, margin: '0 0 var(--sp-4)', overflowWrap: 'anywhere' }}>{roadmap.description}</p>}

      {members.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: base, margin: '16px 0 0' }}>Roadmap vazio. A IA adiciona cursos aqui.</p>
      ) : (
        <RoadmapTrail stages={trailStages(roadmap, byId)} onContinue={onMainAction} />
      )}
    </>,
  )
}

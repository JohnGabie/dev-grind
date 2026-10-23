import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import CourseList from '../components/CourseList'
import CourseNotFound from '../components/CourseNotFound'
import CourseToolbar from '../components/CourseToolbar'
import ProgressBar from '../components/ProgressBar'
import { useCourseData } from '../hooks/useCourseData'
import { useCoursePrefs } from '../hooks/useCoursePrefs'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import { actionLabel, continueTarget } from '../lib/courseProgress'
import { matchesQuery } from '../lib/courseView'
import { courseEntry } from '../lib/listEntry'
import { pagePadding } from '../lib/layout'
import { deleteCoursesNotice, deleteRoadmapParams } from '../lib/roadmapDelete'
import { roadmapCourses, roadmapProgress, roadmapTarget } from '../lib/roadmapModel'

const ROADMAPS_TAB = '/courses?tab=roadmaps'

const DELETE_FAILED = 'Não foi possível apagar o roadmap. Tente de novo.'

export default function RoadmapPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const navigate = useNavigate()
  const { roadmapId } = useParams()
  const { roadmaps, byId, loading, error, roadmapsError, reload } = useCourseData()
  const { prefs, setView } = useCoursePrefs()
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [alsoCourses, setAlsoCourses] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  const entries = members.map((course, index) => courseEntry(course, index + 1))
  const shown = entries.filter(entry => matchesQuery(entry, query))

  const openCourse = (courseId: string, lessonKey: string | null) =>
    navigate(lessonKey ? `/courses/${courseId}/${lessonKey}` : `/courses/${courseId}`)

  const onMainAction = () => {
    if (target) return openCourse(target.courseId, target.lessonKey)
    if (members.length > 0) openCourse(members[0].id, null)
  }

  const closeDialog = () => { setConfirming(false); setAlsoCourses(false); setDeleteError(null) }

  const confirmDelete = async () => {
    setBusy(true)
    setDeleteError(null)
    try {
      await api.delete(`/roadmaps/${roadmap.id}`, { params: deleteRoadmapParams(alsoCourses) })
    } catch (err) {
      if (!(isAxiosError(err) && err.response?.status === 404)) {
        setDeleteError(DELETE_FAILED)
        setBusy(false)
        return
      }
    }
    reload()
    navigate(ROADMAPS_TAB)
  }

  const ghost = { background: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: base, padding: '0 14px', minHeight: 'var(--ctl-md)', boxSizing: 'border-box' as const }

  return shell(
    <>
      <Link to={ROADMAPS_TAB} style={{ color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', minHeight: 'var(--ctl-md)', fontSize: base }}>
        ← roadmaps
      </Link>
      <h1 style={{ fontSize: isMobile ? 'var(--fs-xl)' : 32, margin: '4px 0 8px', overflowWrap: 'anywhere' }}>{roadmap.title}</h1>
      {roadmap.description && <p style={{ color: 'var(--muted)', fontSize: base, margin: '0 0 12px', overflowWrap: 'anywhere' }}>{roadmap.description}</p>}
      <p style={{ fontSize: base, margin: '0 0 8px' }}>
        {count === 1 ? '1 curso' : `${count} cursos`} · {done} de {total} lições
        <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
      </p>
      <ProgressBar done={done} total={total} label={`${roadmap.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      {members.length > 0 && (
        <button type="button" onClick={onMainAction} style={{ ...ghost, border: '1px solid var(--cyan)', color: 'var(--cyan)', margin: '16px 0 24px' }}>
          {action}
        </button>
      )}

      {members.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: base, margin: '16px 0 0' }}>Roadmap vazio. A IA adiciona cursos aqui.</p>
      ) : (
        <>
          <CourseToolbar query={query} onQuery={setQuery} view={prefs.view} onView={setView} placeholder="buscar cursos" />
          {shown.length === 0 ? (
            <div role="status">
              <p style={{ color: 'var(--muted)', fontSize: base, margin: '0 0 8px' }}>Nenhum curso encontrado para “{query.trim()}”</p>
              <button type="button" onClick={() => setQuery('')} style={{ ...ghost, border: '1px solid var(--border)', color: 'var(--cyan)' }}>limpar busca</button>
            </div>
          ) : (
            <CourseList
              entries={shown}
              view={prefs.view}
              onOpen={entry => navigate(`/courses/${entry.id}`)}
              onAction={entry => {
                const course = byId.get(entry.id)
                openCourse(entry.id, course ? continueTarget(course) : null)
              }}
            />
          )}
        </>
      )}

      <div style={{ marginTop: 48 }}>
        <button type="button" onClick={() => setConfirming(true)} style={{ ...ghost, border: '1px solid var(--border)', color: 'var(--muted)' }}>
          apagar roadmap
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`apagar “${roadmap.title}”?`}
          body={
            <>
              <p style={{ margin: 0 }}>O roadmap será apagado. Os cursos continuam, a menos que você marque a opção abaixo.</p>
              {alsoCourses && deleteCoursesNotice(members.length) && (
                <p style={{ margin: '8px 0 0', color: 'var(--red)' }}>{deleteCoursesNotice(members.length)}</p>
              )}
            </>
          }
          checkbox={{ label: 'apagar os cursos também', checked: alsoCourses, onChange: setAlsoCourses }}
          busy={busy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDialog}
        />
      )}
    </>,
  )
}

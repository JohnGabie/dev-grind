import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import ActionsMenu from '../components/ActionsMenu'
import ConfirmDialog from '../components/ConfirmDialog'
import DeleteModeBar from '../components/DeleteModeBar'
import CourseNotFound from '../components/CourseNotFound'
import CourseList from '../components/CourseList'
import CourseToolbar from '../components/CourseToolbar'
import CourseTabs from '../components/CourseTabs'
import { useCourseData } from '../hooks/useCourseData'
import { tabFromParam, type CourseTab } from '../lib/courseTab'
import { bulkDelete } from '../lib/bulkDelete'
import { deleteCoursesNotice, deleteRoadmapParams } from '../lib/roadmapDelete'
import { retainFailed, selectionAfterQuery, toggleSelection } from '../lib/selection'
import { roadmapEntry, roadmapTarget } from '../lib/roadmapModel'
import { useCoursePrefs } from '../hooks/useCoursePrefs'
import { visibleEntries } from '../lib/courseView'
import { courseEntry } from '../lib/listEntry'
import { continueTarget, lessonKeyOf } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY, NARROW_QUERY } from '../hooks/useMediaQuery'
import PageHeader from '../components/PageHeader'
import SkillPath from '../components/SkillPath'
import { type FillPart, type Lesson, type Step } from '../lib/courseModel'
import { pagePadding } from '../lib/layout'

function flat(value: string) {
  return value.replace(/\n/g, '').trim()
}

function matches(given: string, expected: string) {
  return flat(given) === flat(expected)
}

const chipStyle = (on: boolean, isMobile: boolean): CSSProperties => ({
  fontFamily: 'var(--f-mono)',
  fontVariantLigatures: 'none',
  fontSize: isMobile ? 'var(--fs-base)' : 14,
  padding: '8px 12px',
  minHeight: isMobile ? 'var(--ctl-md)' : undefined,
  borderRadius: 'var(--radius-lg)',
  cursor: 'pointer',
  border: on ? '1px solid var(--cyan)' : '1px solid var(--border)',
  background: on ? 'rgba(68,188,211,0.15)' : 'transparent',
  color: 'var(--text)',
})

const BLANK_CH = { s: 3, m: 8, l: 16 }

function blankAnswers(step: Extract<Step, { type: 'fill' }>) {
  return step.parts.filter((part): part is Extract<FillPart, { kind: 'blank' }> => part.kind === 'blank')
}

function StepView({
  step,
  value,
  blanks,
  wrong,
  passed,
  onChange,
  onBlank,
  onClear,
  onSubmit,
  inputRef,
}: {
  step: Step
  value: string
  blanks: string[]
  wrong: boolean
  passed: boolean
  onChange: (value: string) => void
  onBlank: (index: number, value: string) => void
  onClear: () => void
  onSubmit: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [activeBlank, setActiveBlank] = useState(0)
  const [termFocus, setTermFocus] = useState(false)

  if (step.type === 'text') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: isMobile ? 'var(--fs-lg)' : 17, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
          {step.body}
        </p>
      </div>
    )
  }

  if (step.type === 'fill') {
    let blankIndex = 0
    const page = step.parts.map(part => part.kind === 'text' ? part.text : (blanks[blankIndex++] ?? '')).join('')
    blankIndex = 0
    const showPreview = page.includes('<')
    const filled = blanks.some(item => item !== '')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <p style={{ margin: 0, fontSize: isMobile ? 'var(--fs-lg)' : 18, lineHeight: 1.6, textAlign: 'center' }}>{step.prompt}</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: showPreview && !isMobile ? '1fr 1fr' : '1fr',
          gap: 12,
          alignItems: 'stretch',
          minHeight: isMobile && showPreview ? undefined : 300,
          order: isMobile && showPreview ? 2 : 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile && showPreview ? undefined : 300, borderRadius: 10, border: wrong ? '1px solid #f07178' : '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {step.file}
            </div>
            <pre style={{
              margin: 0, padding: '14px 16px', flex: 1, minHeight: isMobile && showPreview ? undefined : 220,
              background: 'rgba(255,255,255,0.03)',
              fontFamily: 'var(--f-mono)', fontSize: isMobile ? 'var(--fs-base)' : 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            }}>
              {step.parts.map((part, index) => {
                if (part.kind === 'text') return <span key={index}>{part.text}</span>
                const current = blankIndex
                const text = blanks[current] ?? ''
                const shown = flat(text)
                const right = matches(shown, part.answer)
                blankIndex += 1
                const blankTone = passed || (wrong && right) ? 'ok' : wrong ? 'bad' : 'idle'
                const measure = shown.length > 0 ? shown : '\u00a0'.repeat(BLANK_CH[part.size])
                const fieldStyle: CSSProperties = {
                  gridArea: '1 / 1',
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: '0 6px',
                  minHeight: isMobile ? 'var(--ctl-md)' : undefined,
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--f-mono)',
                  fontVariantLigatures: 'none',
                  fontSize: isMobile ? 'var(--fs-input)' : 14,
                  lineHeight: 1.5,
                  color: blankTone === 'ok' ? 'var(--green)' : blankTone === 'bad' ? '#f07178' : 'var(--cyan)',
                  background: blankTone === 'ok' ? 'rgba(63,185,80,0.16)' : blankTone === 'bad' ? 'rgba(240,113,120,0.14)' : 'rgba(68,188,211,0.08)',
                  border: blankTone === 'ok'
                    ? '1px solid var(--green)'
                    : blankTone === 'bad'
                      ? '1px solid #f07178'
                      : '1px dashed rgba(68,188,211,0.85)',
                  boxShadow: current === activeBlank && blankTone === 'idle' ? '0 0 0 1px var(--cyan)' : 'none',
                  outline: 'none',
                }
                return (
                  <span key={index} style={{ display: 'inline-grid', verticalAlign: 'middle', margin: '0 2px' }}>
                    <span aria-hidden style={{ ...fieldStyle, visibility: 'hidden', whiteSpace: 'pre' }}>
                      {measure}
                    </span>
                    <input
                      value={shown}
                      size={1}
                      onChange={event => onBlank(current, flat(event.target.value))}
                      onFocus={() => setActiveBlank(current)}
                      spellCheck={false}
                      aria-label={`espaço ${current + 1}`}
                      style={{ ...fieldStyle, width: '100%', minWidth: 0 }}
                    />
                  </span>
                )
              })}
            </pre>
            <div style={{ display: 'flex', gap: 12, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={onClear}
                disabled={!filled}
                style={{ background: 'none', border: 'none', color: filled ? 'var(--muted)' : 'var(--faint)', cursor: filled ? 'pointer' : 'default', padding: 0, minHeight: isMobile ? 'var(--ctl-md)' : undefined, minWidth: isMobile ? 'var(--ctl-md)' : undefined, fontSize: isMobile ? 'var(--fs-sm)' : 12 }}
              >
                limpar
              </button>
            </div>
          </div>
          {showPreview && (
            <iframe
              title="preview"
              sandbox=""
              srcDoc={page}
              style={{
                width: '100%',
                minHeight: isMobile ? 120 : 300,
                height: isMobile ? 140 : '100%',
                maxHeight: isMobile ? 140 : undefined,
                borderRadius: 10, border: '1px solid var(--border)', background: '#fff',
              }}
            />
          )}
        </div>
        {step.choices.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', order: isMobile && showPreview ? 1 : 0 }}>
            {step.choices.map(choice => (
              <button
                key={choice}
                style={chipStyle(blanks.includes(choice), isMobile)}
                onClick={() => onBlank(Math.min(activeBlank, Math.max(blanks.length - 1, 0)), flat(choice))}
              >
                {choice}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (step.type === 'browser') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <p style={{ margin: 0, fontSize: isMobile ? 'var(--fs-lg)' : 18, lineHeight: 1.5, textAlign: 'center' }}>{step.prompt}</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            style={{
              minHeight: 280, resize: 'vertical', padding: 14, borderRadius: 10,
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: isMobile ? 'var(--fs-input)' : 13, lineHeight: 1.5,
            }}
          />
          <iframe
            title="preview"
            sandbox=""
            srcDoc={value}
            style={{ minHeight: 280, width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: '#fff' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', width: '100%' }}>
      <p style={{ margin: 0, fontSize: isMobile ? 'var(--fs-lg)' : 18, lineHeight: 1.5, textAlign: 'center' }}>{step.prompt}</p>
      <div style={{
        width: '100%', maxWidth: 560, minHeight: 160, borderRadius: 10, padding: 16,
        background: '#0d1117', fontFamily: 'var(--f-mono)',
        border: wrong ? '1px solid #f07178' : termFocus ? '1px solid var(--cyan)' : '1px solid var(--border)',
        boxShadow: termFocus ? '0 0 0 1px var(--cyan)' : 'none',
      }}>
        <div style={{ color: 'var(--green)', marginBottom: 8 }}>$</div>
        <input
          ref={inputRef}
          value={value}
          aria-label="comando"
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          onFocus={() => setTermFocus(true)}
          onBlur={() => setTermFocus(false)}
          spellCheck={false}
          style={{
            width: '100%', border: 'none', background: 'transparent', color: 'var(--text)',
            fontFamily: 'var(--f-mono)', fontVariantLigatures: 'none', fontSize: isMobile ? 'var(--fs-input)' : 15, outline: 'none',
            minHeight: isMobile ? 'var(--ctl-md)' : undefined,
          }}
        />
      </div>
    </div>
  )
}

function LessonPlayer({
  courseTitle,
  lesson,
  initialIndex,
  reviewing,
  onBack,
  onComplete,
  onPart,
}: {
  courseTitle: string
  lesson: Lesson
  initialIndex: number
  reviewing: boolean
  onBack: () => void
  onComplete: () => void
  onPart: (partsDone: number) => void
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, lesson.steps.length - 1)))
  const step = lesson.steps[index]
  const [value, setValue] = useState(() => step.type === 'browser' ? step.starter : '')
  const [blanks, setBlanks] = useState<string[]>(() => step.type === 'fill' ? blankAnswers(step).map(() => '') : [])
  const [wrong, setWrong] = useState(false)
  const [passed, setPassed] = useState(false)
  const last = index === lesson.steps.length - 1
  const needsCheck = step.type === 'fill' || step.type === 'terminal'
  const scrollRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [index])

  const changeValue = (next: string) => {
    setValue(next)
    setPassed(false)
    setWrong(false)
  }

  const changeBlank = (blankIndex: number, next: string) => {
    setBlanks(current => blankIndex < 0 ? current.map(() => '') : current.map((item, index) => index === blankIndex ? next : item))
    setPassed(false)
    setWrong(false)
  }

  const retry = () => {
    setWrong(false)
    setPassed(false)
    if (step.type === 'terminal') terminalRef.current?.focus()
  }

  const goNext = () => {
    if (step.type === 'fill' && !passed) {
      const answers = blankAnswers(step)
      const ok = answers.every((part, blankIndex) => matches(blanks[blankIndex] ?? '', part.answer))
      if (!ok) {
        setWrong(true)
        return
      }
      setWrong(false)
      setPassed(true)
      return
    }
    if (step.type === 'terminal' && !passed) {
      if (!matches(value, step.expect)) {
        setWrong(true)
        return
      }
      setWrong(false)
      setPassed(true)
      return
    }
    setWrong(false)
    setPassed(false)
    if (last) {
      onComplete()
      onBack()
      return
    }
    onPart(index + 1)
    const next = lesson.steps[index + 1]
    setIndex(index + 1)
    setValue(next.type === 'browser' ? next.starter : '')
    setBlanks(next.type === 'fill' ? blankAnswers(next).map(() => '') : [])
  }

  const isMobile = useMediaQuery(MOBILE_QUERY)
  const statusText = wrong ? 'Ainda não. Confira o que está em vermelho.' : passed ? 'Certo!' : ''

  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', padding: pagePadding('24px 48px 12px', isMobile, true, false), flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: 860, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexShrink: 0, paddingRight: isMobile ? 'calc(var(--ctl-md) + var(--sp-2))' : undefined }}>
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0, marginBottom: 14, maxWidth: '100%', paddingRight: isMobile ? 'calc(var(--ctl-md) + var(--sp-2))' : undefined, textAlign: 'left', display: isMobile ? 'inline-flex' : undefined, alignItems: isMobile ? 'center' : undefined, minHeight: isMobile ? 'var(--ctl-md)' : undefined, fontSize: isMobile ? 'var(--fs-base)' : undefined }}>
                ← {courseTitle}
              </button>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {lesson.steps.map((_, i) => (
                  <div key={i} style={{
                    height: 4, flex: 1, borderRadius: 4,
                    background: i <= index ? 'var(--cyan)' : 'rgba(255,255,255,0.12)',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {lesson.title} · passo {index + 1} de {lesson.steps.length}{reviewing ? ' · revisão' : ''}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0' }}>
              <div style={{ width: '100%' }}>
                <StepView
                  key={index}
                  step={step}
                  value={value}
                  blanks={blanks}
                  wrong={wrong}
                  passed={passed}
                  onChange={changeValue}
                  onBlank={changeBlank}
                  onClear={() => changeBlank(-1, '')}
                  onSubmit={wrong ? retry : goNext}
                  inputRef={terminalRef}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', borderTop: `1px solid ${wrong ? '#f07178' : 'var(--border)'}` }}>
        <div style={{ padding: pagePadding('14px 48px 14px', isMobile, false, false) }}>
          <div
            role="status"
            style={{ fontSize: 13, textAlign: 'right', marginBottom: statusText ? 8 : 0, color: wrong ? '#f07178' : 'var(--green)' }}
          >
            {statusText}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={wrong ? retry : goNext}
              style={{
                flexShrink: 0, minHeight: isMobile ? 'var(--ctl-primary)' : undefined, fontSize: isMobile ? 'var(--fs-base)' : 15, fontWeight: 700, padding: '12px 22px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                background: wrong ? 'rgba(240,113,120,0.14)' : 'rgba(68,188,211,0.16)',
                border: wrong ? '1px solid #f07178' : '1px solid rgba(68,188,211,0.45)',
                color: wrong ? '#f07178' : 'var(--cyan)',
              }}
            >
              {wrong ? 'tentar novamente' : needsCheck && !passed ? 'verificar' : last ? 'concluir' : 'continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const narrow = useMediaQuery(NARROW_QUERY)
  const { courses, setCourses, roadmaps, byId, loading, error: loadError, roadmapsError, reload } = useCourseData()
  const navigate = useNavigate()
  const { prefs, setView, setSort } = useCoursePrefs()
  const [query, setQuery] = useState('')
  const [deleteMode, setDeleteMode] = useState<CourseTab | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [alsoCourses, setAlsoCourses] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFromParam(searchParams.get('tab'))
  const [courseId,lessonKey] = (useParams()['*'] ?? '').split('/').filter(Boolean)
  const actionsRef = useRef<HTMLButtonElement>(null)
  const focusActionsAfterExit = useRef(false)

  const inDeleteMode = deleteMode === tab && !courseId

  const enterDeleteMode = () => {
    setDeleteMode(tab)
    setSelected(new Set())
    setAlsoCourses(false)
    setDeleteError(null)
  }

  const exitDeleteMode = () => {
    setDeleteMode(null)
    setSelected(new Set())
    setConfirming(false)
    setDeleteError(null)
  }

  const leaveDeleteMode = () => {
    focusActionsAfterExit.current = true
    exitDeleteMode()
  }

  const changeQuery = (next: string) => {
    setSelected(current => selectionAfterQuery(current, query, next))
    setQuery(next)
  }

  const selectTab = (next: CourseTab) => {
    exitDeleteMode()
    setSearchParams(next === 'roadmaps' ? { tab: 'roadmaps' } : {}, { replace: true })
  }

  const course = courses.find(item => item.id === courseId) ?? null
  const lesson = course?.sections.flatMap(section => section.lessons.map(item => ({
    section,
    item,
    key: lessonKeyOf(item),
  })))
    .find(entry => entry.key === lessonKey)
  const ready = !loading && !loadError

  const soon = { disabled: true, hint: 'em breve', onSelect: () => {} }
  const menuItems = tab === 'roadmaps'
    ? [
      { key: 'create', label: 'criar roadmap', ...soon },
      { key: 'edit', label: 'editar roadmaps', ...soon },
      { key: 'delete', label: 'apagar roadmaps', disabled: roadmaps.length === 0, onSelect: enterDeleteMode },
    ]
    : [
      { key: 'create', label: 'criar curso', ...soon },
      { key: 'edit', label: 'editar cursos', ...soon },
      { key: 'delete', label: 'apagar cursos', disabled: courses.length === 0, onSelect: enterDeleteMode },
    ]

  const deleteCourses = async (ids: string[]) => {
    const result = await bulkDelete(ids, id => api.delete(`/courses/${id}`))
    setCourses(list => list.filter(item => !result.deleted.includes(item.id)))
    return result
  }

  const deleteRoadmaps = async (ids: string[], alsoCourses: boolean) => {
    const result = await bulkDelete(ids, id => api.delete(`/roadmaps/${id}`, { params: deleteRoadmapParams(alsoCourses) }))
    if (alsoCourses) {
      const removed = new Set(roadmaps.filter(item => result.deleted.includes(item.id)).flatMap(item => item.course_ids))
      setCourses(list => list.filter(item => !removed.has(item.id)))
    }
    return result
  }

  const roadmapTab = tab === 'roadmaps'
  const allEntries = roadmapTab ? roadmaps.map(item => roadmapEntry(item, byId)) : courses.map(item => courseEntry(item))
  const shown = visibleEntries(allEntries, query, prefs.sort)
  const chosen = shown.filter(entry => selected.has(entry.id))
  const chosenIds = chosen.map(entry => entry.id)
  const coursesOfChosen = new Set(roadmaps.filter(item => chosenIds.includes(item.id)).flatMap(item => item.course_ids).filter(id => byId.has(id))).size

  const barOnOwnRow = inDeleteMode && narrow
  const deleteBar = (
    <DeleteModeBar
      count={chosen.length}
      busy={busy}
      onExit={leaveDeleteMode}
      onDelete={() => setConfirming(true)}
    />
  )

  const confirmDelete = async () => {
    setBusy(true)
    setDeleteError(null)
    const result = roadmapTab ? await deleteRoadmaps(chosenIds, alsoCourses) : await deleteCourses(chosenIds)
    setBusy(false)
    if (result.deleted.length > 0) reload()
    if (result.failed.length === 0) {
      leaveDeleteMode()
      return
    }
    setSelected(current => retainFailed(current, result.failed))
    setDeleteError(`Não foi possível apagar: ${chosen.filter(entry => result.failed.includes(entry.id)).map(entry => entry.title).join(', ')}`)
  }

  const cancelConfirm = () => {
    setConfirming(false)
    setDeleteError(null)
  }

  useEffect(() => {
    if (!focusActionsAfterExit.current || deleteMode !== null) return
    focusActionsAfterExit.current = false
    actionsRef.current?.focus()
  }, [deleteMode])

  const viewKey = `${tab}|${courseId ?? ''}`
  const [seenViewKey, setSeenViewKey] = useState(viewKey)
  if (seenViewKey !== viewKey) {
    setSeenViewKey(viewKey)
    exitDeleteMode()
  }

  useEffect(() => {
    if (!inDeleteMode || confirming) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      focusActionsAfterExit.current = true
      exitDeleteMode()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [inDeleteMode, confirming])

  useEffect(() => {
    document.body.dataset.courseLesson = lesson ? '1' : ''
    return () => { delete document.body.dataset.courseLesson }
  }, [lesson?.key])

  return (
    <div style={{ height: '100%', overflow: lesson ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: lesson ? '0 0 auto' : '1 0 auto', minHeight: 0, display: lesson ? 'none' : 'flex', flexDirection: 'column',
        maxWidth: 1080, width: '100%', margin: '0 auto',
        padding: pagePadding('40px 48px 72px', isMobile, true, !courseId),
      }}>
        {!courseId && (
          tab === 'roadmaps'
            ? <PageHeader minLines={3} minLinesDesktop={2} eyebrow="// trilhas de estudo" title="roadmaps" description="Roadmaps agrupam seus cursos em uma trilha. A IA monta e organiza." />
            : <PageHeader minLines={3} minLinesDesktop={2} eyebrow="// trilhas de estudo" title="cursos" description="Seus cursos, feitos pela IA com base nos seus livros e nas suas lacunas. Abra um e siga lição por lição." />
        )}

        {!courseId && (
          <CourseTabs
            tab={tab}
            onTab={selectTab}
            actions={inDeleteMode ? (barOnOwnRow ? null : deleteBar) : <ActionsMenu items={menuItems} buttonRef={actionsRef} />}
          />
        )}
        {!courseId && barOnOwnRow && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'calc(var(--sp-1) * -1)', marginBottom: 'var(--sp-4)' }}>{deleteBar}</div>
        )}

        {loadError && (
          <div>
            <p style={{ color: 'var(--muted)' }}>{loadError}</p>
            <button onClick={reload} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--cyan)', cursor: 'pointer', padding: '8px 14px', minHeight: isMobile ? 44 : undefined }}>
              tentar de novo
            </button>
          </div>
        )}

        {!course && !loadError && loading && <p style={{ color: 'var(--muted)' }}>Carregando…</p>}

        {!courseId && (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'cursos' && ready && courses.length === 0 && (
          <div>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Nenhum curso ainda.</p>
            <p style={{ color: 'var(--muted)', fontSize: isMobile ? 'var(--fs-sm)' : 12 }}>Os cursos são criados pelo assistente de IA.</p>
          </div>
        )}

        {tab === 'roadmaps' && !loadError && roadmapsError && (
          <div>
            <p style={{ color: 'var(--muted)' }}>{roadmapsError}</p>
            <button onClick={reload} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32 }}>
              tentar de novo
            </button>
          </div>
        )}

        {tab === 'roadmaps' && ready && !roadmapsError && roadmaps.length === 0 && (
          <p style={{ color: 'var(--muted)', margin: 0 }}>Nenhum roadmap ainda. A IA cria roadmaps para agrupar seus cursos.</p>
        )}

        {((tab === 'cursos' && courses.length > 0) || (tab === 'roadmaps' && ready && roadmaps.length > 0)) && (
          <CourseToolbar query={query} onQuery={changeQuery} sort={prefs.sort} onSort={setSort} view={prefs.view} onView={setView} placeholder={tab === 'roadmaps' ? 'buscar roadmaps' : 'buscar cursos'} />
        )}

        {((tab === 'cursos' && courses.length > 0) || (tab === 'roadmaps' && ready && roadmaps.length > 0)) && (() => {
          const noun = roadmapTab ? 'roadmap' : 'curso'
          if (shown.length === 0) {
            return (
              <div role="status">
                <p style={{ color: 'var(--muted)', margin: '0 0 8px' }}>Nenhum {noun} encontrado para “{query.trim()}”</p>
                <button type="button" onClick={() => changeQuery('')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32 }}>
                  limpar busca
                </button>
              </div>
            )
          }
          return (
            <CourseList
              entries={shown}
              view={prefs.view}
              selectMode={inDeleteMode}
              selected={selected}
              onToggle={entry => setSelected(current => toggleSelection(current, entry.id))}
              onOpen={entry => navigate(roadmapTab ? `/roadmaps/${entry.id}` : `/courses/${entry.id}`)}
              onAction={entry => {
                if (roadmapTab) {
                  const roadmap = roadmaps.find(item => item.id === entry.id)
                  const target = roadmap ? roadmapTarget(roadmap, byId) : null
                  if (!target) return navigate(`/roadmaps/${entry.id}`)
                  return navigate(target.lessonKey ? `/courses/${target.courseId}/${target.lessonKey}` : `/courses/${target.courseId}`)
                }
                const target = byId.get(entry.id)
                const key = target ? continueTarget(target) : null
                navigate(key ? `/courses/${entry.id}/${key}` : `/courses/${entry.id}`)
              }}
            />
          )
        })()}
          </div>
        )}

        {inDeleteMode && confirming && (
          <ConfirmDialog
            title={`Apagar ${chosen.length} ${roadmapTab ? (chosen.length === 1 ? 'roadmap' : 'roadmaps') : (chosen.length === 1 ? 'curso' : 'cursos')}?`}
            body={
              <>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)', overflowWrap: 'anywhere' }}>
                  {chosen.map(entry => <li key={entry.id}>{entry.title}</li>)}
                </ul>
                <p style={{ margin: '8px 0 0' }}>O progresso será perdido. Não dá para desfazer.</p>
                {roadmapTab && alsoCourses && <p style={{ margin: '8px 0 0', color: 'var(--red)' }}>{deleteCoursesNotice(coursesOfChosen)}</p>}
              </>
            }
            checkbox={roadmapTab ? { label: 'apagar os cursos também', checked: alsoCourses, onChange: setAlsoCourses } : undefined}
            busy={busy}
            error={deleteError}
            onConfirm={confirmDelete}
            onCancel={cancelConfirm}
          />
        )}

        {course && !lessonKey && (
          <div>
            <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', padding: '12px 0 10px', marginBottom: 12 }}>
              <button onClick={() => navigate('/courses')} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0, marginBottom: isMobile ? 0 : 10, display: isMobile ? 'inline-flex' : undefined, alignItems: isMobile ? 'center' : undefined, minHeight: isMobile ? 'var(--ctl-md)' : undefined, fontSize: isMobile ? 'var(--fs-base)' : undefined }}>
                ← cursos
              </button>
              <h1 style={{ fontSize: isMobile ? 'var(--fs-xl)' : 32, margin: 0, paddingRight: isMobile ? 'calc(var(--ctl-md) + var(--sp-2))' : undefined }}>{course.title}</h1>
            </div>
            <SkillPath
              courseId={course.id}
              sections={course.sections}
              completed={course.completed}
              partsDone={course.parts}
              onOpen={key => navigate(`/courses/${course.id}/${key}`)}
            />
          </div>
        )}
        {courseId && ready && !course && (
          <CourseNotFound text="curso não encontrado" to="/courses" linkText="← cursos" />
        )}
        {course && lessonKey && ready && !lesson && (
          <CourseNotFound text="lição não encontrada" to={`/courses/${course.id}`} linkText={`← ${course.title}`} />
        )}

      </div>
      {course && lesson && (
        <LessonPlayer
          key={lesson.key}
          courseTitle={course.title}
          lesson={lesson.item}
          initialIndex={course.completed.includes(lesson.key) ? 0 : (course.parts[lesson.key] ?? 0)}
          reviewing={course.completed.includes(lesson.key)}
          onBack={() => navigate(`/courses/${course.id}`)}
          onPart={count => {
            if (course.completed.includes(lesson.key)) return
            const previous = course.parts[lesson.key] ?? 0
            setCourses(list => list.map(item => item.id === course.id
              ? { ...item, parts: { ...item.parts, [lesson.key]: count } }
              : item))
            api.post(`/courses/${course.id}/lessons/${lesson.key}/progress`, { parts_done: count }).catch(() => {
              setCourses(list => list.map(item => item.id === course.id
                ? { ...item, parts: { ...item.parts, [lesson.key]: previous } }
                : item))
            })
          }}
          onComplete={() => {
            if (!lessonKey || course.completed.includes(lessonKey)) return
            const key = lessonKey
            setCourses(list => list.map(item => item.id === course.id ? { ...item, completed: [...item.completed, key] } : item))
            api.post(`/courses/${course.id}/lessons/${key}/complete`).catch(() => {
              setCourses(list => list.map(item => item.id === course.id ? { ...item, completed: item.completed.filter(done => done !== key) } : item))
            })
          }}
        />
      )}
    </div>
  )
}

import { useEffect, useState, type CSSProperties } from 'react'
import api from '../api/client'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { asCourse, type Course, type FillPart, type Lesson, type Step } from '../lib/courseModel'
import { pagePadding } from '../lib/layout'

function flat(value: string) {
  return value.replace(/\n/g, '').trim()
}

function matches(given: string, expected: string) {
  return flat(given) === flat(expected)
}

const chipStyle = (on: boolean): CSSProperties => ({
  fontFamily: 'var(--f-mono)',
  fontSize: 14,
  padding: '8px 12px',
  borderRadius: 8,
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
}: {
  step: Step
  value: string
  blanks: string[]
  wrong: boolean
  passed: boolean
  onChange: (value: string) => void
  onBlank: (index: number, value: string) => void
  onClear: () => void
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [activeBlank, setActiveBlank] = useState(0)

  if (step.type === 'text') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
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
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, textAlign: 'center' }}>{step.prompt}</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: showPreview && !isMobile ? '1fr 1fr' : '1fr',
          gap: 12,
          alignItems: 'stretch',
          minHeight: 300,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 300, borderRadius: 10, border: wrong ? '1px solid #f07178' : '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {step.file}
            </div>
            <pre style={{
              margin: 0, padding: '14px 16px', flex: 1, minHeight: 220,
              background: 'rgba(255,255,255,0.03)',
              fontFamily: 'var(--f-mono)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
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
                  borderRadius: 6,
                  fontFamily: 'var(--f-mono)',
                  fontSize: 14,
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
                style={{ background: 'none', border: 'none', color: filled ? 'var(--muted)' : 'var(--faint)', cursor: filled ? 'pointer' : 'default', padding: 0, fontSize: 12 }}
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
              style={{ width: '100%', minHeight: 300, height: '100%', borderRadius: 10, border: '1px solid var(--border)', background: '#fff' }}
            />
          )}
        </div>
        {step.choices.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {step.choices.map(choice => (
              <button
                key={choice}
                style={chipStyle(blanks.includes(choice))}
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
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, textAlign: 'center' }}>{step.prompt}</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            style={{
              minHeight: 280, resize: 'vertical', padding: 14, borderRadius: 10,
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 13, lineHeight: 1.5,
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
      <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, textAlign: 'center' }}>{step.prompt}</p>
      <div style={{
        width: '100%', maxWidth: 560, minHeight: 160, borderRadius: 10, padding: 16,
        background: '#0d1117', border: '1px solid var(--border)', fontFamily: 'var(--f-mono)',
      }}>
        <div style={{ color: 'var(--green)', marginBottom: 8 }}>$</div>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', border: 'none', background: 'transparent', color: 'var(--text)',
            fontFamily: 'var(--f-mono)', fontSize: 15, outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function LessonPlayer({
  courseTitle,
  lesson,
  onBack,
  onComplete,
}: {
  courseTitle: string
  lesson: Lesson
  onBack: () => void
  onComplete: () => void
}) {
  const [index, setIndex] = useState(0)
  const step = lesson.steps[index]
  const [value, setValue] = useState(() => step.type === 'browser' ? step.starter : '')
  const [blanks, setBlanks] = useState<string[]>(() => step.type === 'fill' ? blankAnswers(step).map(() => '') : [])
  const [wrong, setWrong] = useState(false)
  const [passed, setPassed] = useState(false)
  const last = index === lesson.steps.length - 1
  const needsCheck = step.type === 'fill' || step.type === 'terminal'

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
    if (step.type === 'fill') setBlanks(blankAnswers(step).map(() => ''))
    if (step.type === 'terminal') setValue('')
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
    if (step.type === 'terminal' && !matches(value, step.expect)) {
      setWrong(true)
      return
    }
    setWrong(false)
    setPassed(false)
    if (last) {
      onComplete()
      onBack()
      return
    }
    const next = lesson.steps[index + 1]
    setIndex(index + 1)
    setValue(next.type === 'browser' ? next.starter : '')
    setBlanks(next.type === 'fill' ? blankAnswers(next).map(() => '') : [])
  }

  const isMobile = useMediaQuery(MOBILE_QUERY)

  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', padding: pagePadding('24px 48px 12px', isMobile, true), flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: 860, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexShrink: 0 }}>
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0, marginBottom: 14 }}>
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
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', borderTop: `1px solid ${wrong ? '#f07178' : 'var(--border)'}` }}>
        <div style={{ padding: pagePadding('14px 48px 14px', isMobile, false) }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={wrong ? retry : goNext}
              style={{
                flexShrink: 0, fontSize: 15, fontWeight: 700, padding: '12px 22px', borderRadius: 8, cursor: 'pointer',
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
  const [courses, setCourses] = useState<Course[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [lessonKey, setLessonKey] = useState<string | null>(null)

  useEffect(() => {
    api.get('/courses')
      .then(r => {
        const rows = Array.isArray(r.data) ? r.data as Record<string, unknown>[] : []
        setCourses(rows.map(asCourse).filter((course): course is Course => course !== null))
      })
      .catch(() => setLoadError('Não foi possível carregar os cursos.'))
  }, [])

  const course = courses.find(item => item.id === openId) ?? null
  const lesson = course?.sections.flatMap(section => section.lessons.map(item => ({
    section,
    item,
    key: `${item.sectionIndex}-${item.lessonIndex}`,
  })))
    .find(entry => entry.key === lessonKey)

  useEffect(() => {
    document.body.dataset.courseLesson = lesson ? '1' : ''
    return () => { delete document.body.dataset.courseLesson }
  }, [lesson])

  return (
    <div style={{ height: '100%', overflow: lesson ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: lesson ? '0 0 auto' : 1, minHeight: 0, display: lesson ? 'none' : 'flex', flexDirection: 'column',
        maxWidth: 1080, width: '100%', margin: '0 auto',
        padding: pagePadding('40px 48px 72px', isMobile, true),
      }}>
        {loadError && <p style={{ color: 'var(--muted)' }}>{loadError}</p>}

        {!course && !loadError && courses.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>Nenhum curso neste formato ainda.</p>
        )}

        {!course && courses.map(item => (
          <button
            key={item.id}
            className="card"
            onClick={() => setOpenId(item.id)}
            style={{ display: 'block', width: '100%', maxWidth: 640, textAlign: 'left', padding: '18px 20px', marginBottom: 10, cursor: 'pointer', background: 'transparent', color: 'inherit' }}
          >
            <span style={{ display: 'block', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{item.title}</span>
            {item.description && <span style={{ display: 'block', color: 'var(--muted)', marginBottom: 8 }}>{item.description}</span>}
            <span style={{ color: 'var(--cyan)' }}>
              {item.completed.length} de {item.sections.reduce((n, section) => n + section.lessons.length, 0)} lições
            </span>
          </button>
        ))}

        {course && !lesson && (
          <div style={{ maxWidth: 640 }}>
            <button onClick={() => setOpenId(null)} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
              ← cursos
            </button>
            <h1 style={{ fontSize: 32, margin: '0 0 22px' }}>{course.title}</h1>
            {course.sections.map(section => (
              <div key={section.title} style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--faint)', margin: '0 0 8px' }}>{section.title}</p>
                {section.lessons.map((item, li) => {
                  const key = `${item.sectionIndex}-${item.lessonIndex}`
                  const done = course.completed.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => setLessonKey(key)}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: 8, cursor: 'pointer', background: 'transparent', color: 'var(--text)', borderColor: done ? 'var(--green)' : undefined }}
                    >
                      <span>{String(li + 1).padStart(2, '0')}  {item.title}</span>
                      {done && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="feita">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

      </div>
      {course && lesson && (
        <LessonPlayer
          key={lesson.key}
          courseTitle={course.title}
          lesson={lesson.item}
          onBack={() => setLessonKey(null)}
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

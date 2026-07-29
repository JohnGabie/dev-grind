import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding } from '../lib/layout'

const PHASES = [
  {
    phase: 1, label: 'Python com Intenção', status: 'active',
    modules: [
      { title: 'Tipos de dados reais do Python', status: 'next', topics: ['float vs double', 'str vs char', 'bool, list, dict'] },
      { title: 'Funções', status: 'locked', topics: ['return vs print', '*args, **kwargs', 'default arguments'] },
      { title: 'Estruturas de dados', status: 'locked', topics: ['dict como acumulador', 'list comprehension', 'operações em lista'] },
      { title: 'Controle de fluxo', status: 'locked', topics: ['== vs is', 'mutabilidade', 'try/except/finally'] },
      { title: 'Async/Await', status: 'locked', topics: ['event loop', 'coroutines', 'asyncio correto'] },
    ]
  },
  {
    phase: 2, label: 'SQL com Fundamento', status: 'locked',
    modules: [
      { title: 'CRUD completo', status: 'locked', topics: ['INSERT, UPDATE, DELETE', 'transações'] },
      { title: 'Joins e Agregações', status: 'locked', topics: ['INNER, LEFT JOIN', 'GROUP BY, HAVING', 'COUNT, SUM, AVG'] },
      { title: 'Performance', status: 'locked', topics: ['índices', 'EXPLAIN ANALYZE', 'tipos corretos'] },
    ]
  },
  {
    phase: 3, label: 'FastAPI com Intenção', status: 'locked',
    modules: [
      { title: 'Pydantic e Validação', status: 'locked', topics: ['modelos', 'validação', '422 errors'] },
      { title: 'Autenticação', status: 'locked', topics: ['JWT', 'IDOR', 'proteção de endpoints'] },
      { title: 'Arquitetura', status: 'locked', topics: ['endpoint → service → repo', 'REST URIs', 'separação de camadas'] },
    ]
  },
  {
    phase: 4, label: 'ZionHub: Code Review Real', status: 'locked',
    modules: [
      { title: 'Análise de segurança', status: 'locked', topics: ['15 vulnerabilidades', 'IDOR cross-tenant', 'patches'] },
    ]
  },
]

const S: Record<string, { border: string; dot: string; label: string }> = {
  done:   { border: 'rgba(63,185,80,0.3)',    dot: 'var(--green)', label: 'done' },
  active: { border: 'rgba(68,188,211,0.3)',   dot: 'var(--cyan)',  label: 'active' },
  next:   { border: 'rgba(68,188,211,0.18)',  dot: 'var(--cyan)',  label: 'next' },
  locked: { border: 'var(--border)',          dot: 'var(--faint)', label: 'locked' },
}

interface AiCourse {
  id: string
  title: string
  description: string | null
  book_slug: string | null
  modules: unknown[]
  is_complete: boolean
  created_at: string | null
}

function AiCourseCard({ course }: { course: AiCourse }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const moduleCount = Array.isArray(course.modules) ? course.modules.length : 0

  return (
    <div
      className="card"
      style={{
        padding: '16px 18px',
        borderColor: course.is_complete ? 'rgba(63,185,80,0.25)' : 'rgba(68,188,211,0.2)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{course.title}</span>
            {course.is_complete ? (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                border: '1px solid rgba(63,185,80,0.4)', color: 'var(--green)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>completo</span>
            ) : (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                border: '1px solid rgba(68,188,211,0.35)', color: 'var(--cyan)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>em andamento</span>
            )}
          </div>

          {course.description && (
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 6px', lineHeight: 1.6 }}>
              {course.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--faint)' }}>
              {moduleCount} módulo{moduleCount !== 1 ? 's' : ''}
              {course.book_slug && ` · ${course.book_slug}`}
            </span>
            {moduleCount > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, color: 'var(--muted)', padding: 0,
                }}
              >
                {expanded ? '▲ ocultar' : '▼ ver módulos'}
              </button>
            )}
          </div>
        </div>

        {/* Continue with AI — only when incomplete */}
        {!course.is_complete && (
          <button
            onClick={() => navigate('/chats')}
            style={{
              flexShrink: 0,
              fontSize: 10, fontWeight: 600,
              padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
              background: 'rgba(68,188,211,0.07)',
              border: '1px solid rgba(68,188,211,0.3)',
              color: 'var(--cyan)',
              whiteSpace: 'nowrap',
            }}
            title="Pedir à IA para continuar este curso"
          >
            continuar com IA
          </button>
        )}
      </div>

      {/* Modules list — expanded */}
      {expanded && moduleCount > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {!course.is_complete && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: 10, padding: '6px 10px', borderRadius: 4,
              background: 'rgba(68,188,211,0.05)',
              border: '1px solid rgba(68,188,211,0.15)',
            }}>
              <span style={{ fontSize: 10, color: 'var(--cyan)' }}>⚠</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                Curso incompleto — abre o chat e pede para a IA adicionar mais módulos.
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(course.modules as Record<string, unknown>[]).map((mod, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 4,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px' }}>
                  {String(mod.title ?? `Módulo ${i + 1}`)}
                </p>
                {Array.isArray(mod.topics) && mod.topics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(mod.topics as string[]).map((t, ti) => (
                      <span key={ti} className="tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoursesPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [aiCourses, setAiCourses] = useState<AiCourse[]>([])

  useEffect(() => {
    api.get('/courses').then(r => setAiCourses(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: pagePadding('52px 48px 72px', isMobile) }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em' }}>
            // trilha de aprendizado
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
            cursos
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, maxWidth: 480, lineHeight: 1.7 }}>
            cada módulo gera exercícios práticos calibrados para você,<br />
            baseados nos livros da biblioteca.
          </p>
        </div>

        {/* AI-generated courses */}
        {aiCourses.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <p className="section-label" style={{ margin: 0 }}>cursos gerados pela IA</p>
              {aiCourses.some(c => !c.is_complete) && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                  border: '1px solid rgba(68,188,211,0.3)', color: 'var(--cyan)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {aiCourses.filter(c => !c.is_complete).length} em andamento
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aiCourses.map(course => (
                <AiCourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}

        {/* Static phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {PHASES.map((phase, pi) => {
            const ps = S[phase.status]
            const isLocked = phase.status === 'locked'
            return (
              <div key={phase.phase} className="fade-up" style={{ animationDelay: `${pi * 60}ms`, opacity: 0 }}>

                {/* Phase header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isLocked ? 'transparent' : 'rgba(68,188,211,0.07)',
                    border: `1px solid ${ps.border}`,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ps.dot }}>{phase.phase}</span>
                  </div>
                  <h2 style={{
                    fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em',
                    color: isLocked ? 'var(--faint)' : 'var(--text)',
                  }}>
                    {phase.label}
                  </h2>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
                    border: `1px solid ${ps.border}`, color: ps.dot,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {ps.label}
                  </span>
                </div>

                {/* Modules grid */}
                <div style={{
                  marginLeft: 40,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 8,
                }}>
                  {phase.modules.map((mod, i) => {
                    const ms = S[mod.status]
                    return (
                      <div key={i} className="card" style={{
                        padding: '14px 16px',
                        borderColor: ms.border,
                        opacity: mod.status === 'locked' ? 0.5 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: ms.dot }} />
                          <p style={{
                            fontSize: 12, fontWeight: 600, margin: 0,
                            color: mod.status === 'locked' ? 'var(--muted)' : 'var(--text)',
                          }}>
                            {mod.title}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {mod.topics.map(t => (
                            <span key={t} className="tag">{t}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

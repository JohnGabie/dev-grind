import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChatPanel } from '../components/ChatPanel'
import { KataSolver } from '../components/KataSolver'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { DIFF_COLOR, renderDesc, type ExerciseData } from '../lib/exercise'
import { hiddenCasesNote } from '../lib/kataResults'
import api from '../api/client'

/**
 * Tela de resolver — /exercise/:slug/solve. O enunciado mora na página "sobre";
 * aqui ele só aparece sob demanda, para o editor ficar com a tela inteira.
 * Editor, grader e envio moram em KataSolver; esta página fica com a navegação,
 * o título, o enunciado e o chat.
 */
export default function ExercisePage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const [exercise, setExercise] = useState<ExerciseData | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showEnunciado, setShowEnunciado] = useState(false)
  const [pyLoading, setPyLoading] = useState(false)
  const [allPassed, setAllPassed] = useState(false)

  useEffect(() => {
    if (!slug) return
    api.get(`/exercises/${slug}`).then(r => setExercise(r.data))
  }, [slug])

  const onActivity = useCallback((a: { pyLoading: boolean }) => setPyLoading(a.pyLoading), [])
  const onGradeState = useCallback((g: { allPassed: boolean }) => setAllPassed(g.allPassed), [])
  const toggleChat = useCallback(() => setShowChat(v => !v), [])

  if (!slug || !exercise) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="f-mono" style={{ color: 'var(--muted)', fontSize: isMobile ? 'var(--fs-sm)' : 12 }}>
        {!slug ? 'carregando...' : 'carregando exercício...'}
      </span>
    </div>
  )

  const diffColor = DIFF_COLOR[exercise.difficulty] || 'var(--muted)'
  const voltarParaSobre = () => navigate(`/exercise/${exercise.slug}`)
  const hiddenCount = exercise.test_cases.filter(tc => !tc.visible).length
  const feito = exercise.user_status === 'completed' || allPassed

  const check = feito && (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="feito" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  const desktopHeader = (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 18px', height: 40,
      borderBottom: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      <button onClick={voltarParaSobre} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--border-lit)', padding: '4px 0', transition: 'color 150ms',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--muted)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--border-lit)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="f-mono" style={{ fontSize: 'var(--fs-xs)' }}>sobre o desafio</span>
      </button>

      <div style={{ width: 1, height: 12, background: 'var(--border)' }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
        borderRadius: 'var(--radius-sm)', background: `${diffColor}14`, border: `1px solid ${diffColor}30`,
      }}>
        <span style={{ fontSize: isMobile ? 'var(--fs-xs)' : 9, fontWeight: 700, color: diffColor, letterSpacing: '0.05em', fontFamily: 'var(--f-mono)' }}>
          {exercise.difficulty}
        </span>
      </div>

      <span style={{ fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercise.title}</span>
        {check}
      </span>

      {pyLoading && (
        <span className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          python
        </span>
      )}
    </div>
  )

  const mobileHeader = (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: isMobile ? '0 var(--sp-5)' : '0 12px', height: 44,
      borderBottom: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      <button onClick={voltarParaSobre} style={{
        minWidth: 44, minHeight: 44, marginLeft: -8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <span style={{
        fontSize: isMobile ? 'var(--fs-xs)' : 9, fontWeight: 700, color: diffColor, fontFamily: 'var(--f-mono)',
        padding: '3px 7px', borderRadius: 'var(--radius-sm)',
        background: `${diffColor}14`, border: `1px solid ${diffColor}30`, flexShrink: 0,
      }}>
        {exercise.difficulty}
      </span>

      <span style={{
        fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)', flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercise.title}</span>
        {check}
      </span>

      {/* O enunciado tem página própria, mas relê-lo no meio do código não
          pode custar perder o que já foi escrito — daí a folha. */}
      <button
        onClick={() => setShowEnunciado(true)}
        title="ver enunciado"
        style={{
          minWidth: 44, minHeight: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </button>

      {/* A bolha global de chat cobria o botão "enviar", então ela some nesta
          tela e a IA vem para cá — travar num kata é exatamente quando se
          precisa dela. */}
      <button
        onClick={() => setShowChat(true)}
        title="perguntar para a IA"
        style={{
          minWidth: 44, minHeight: 44, marginRight: -8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          color: showChat ? 'var(--cyan)' : 'var(--muted)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  )

  const enunciadoDesktop = (
    <div style={{
      width: '38%', flexShrink: 0, overflowY: 'auto',
      padding: '24px 26px 24px 22px', borderRight: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 'var(--fs-base)', lineHeight: 1.8, color: 'var(--muted)' }}
        dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />
      <div style={{ marginTop: 28 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>casos de teste</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exercise.test_cases.filter(tc => tc.visible).map(tc => (
            <div key={tc.id} className="card" style={{ padding: '10px 14px' }}>
              <p className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', opacity: 0.6, marginBottom: 5 }}>
                {tc.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <code className="f-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>{tc.input}</code>
                <span style={{ color: 'var(--border-lit)' }}>→</span>
                <code className="f-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--green)' }}>{tc.expected}</code>
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', opacity: 0.4, margin: '4px 0 0' }}>
              {hiddenCasesNote(hiddenCount, 'no envio')}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const chatDesktop = (
    <div style={{
      flexShrink: 0, height: 280, borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
      }}>
        <span className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>
          IA — {exercise.title}
        </span>
        <button onClick={() => setShowChat(false)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0,
        }}>×</button>
      </div>
      <ChatPanel context={`kata:${exercise.slug}`} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )

  // Chat da IA no contexto deste kata, em folha inteira.
  const chatMobile = (
    <>
      <div onClick={() => setShowChat(false)}
        style={{ position: 'absolute', inset: 0, zIndex: 42, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 40, zIndex: 43,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', borderTop: '1px solid var(--border-lit)',
        borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden',
        animation: 'sheet-up 200ms ease',
      }}>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span className="f-mono" style={{
            fontSize: 'var(--fs-sm)', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'rgba(240,240,240,0.45)',
          }}>
            IA — este kata
          </span>
          <button onClick={() => setShowChat(false)} style={{
            minWidth: 44, minHeight: 44, marginRight: -10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>
        <ChatPanel context={`kata:${exercise.slug}`} style={{ flex: 1, minHeight: 0 }} />
      </div>
    </>
  )

  // Enunciado sob demanda, sem sair da tela nem perder o código.
  const enunciadoMobile = (
    <>
      <div onClick={() => setShowEnunciado(false)}
        style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 40, zIndex: 41,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', borderTop: '1px solid var(--border-lit)',
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        animation: 'sheet-up 200ms ease',
      }}>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span className="f-mono" style={{
            fontSize: 'var(--fs-sm)', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'rgba(240,240,240,0.45)',
          }}>
            enunciado
          </span>
          <button onClick={() => setShowEnunciado(false)} style={{
            minWidth: 44, minHeight: 44, marginRight: -10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 40px' }}>
          <div style={{ fontSize: isMobile ? 'var(--fs-base)' : 14, lineHeight: 1.8, color: 'var(--muted)' }}
            dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />
          <p className="f-mono" style={{
            fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: '0.11em',
            textTransform: 'uppercase', color: 'rgba(240,240,240,0.45)', margin: '26px 0 10px',
          }}>
            casos de teste
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {exercise.test_cases.filter(tc => tc.visible).map(tc => (
              <div key={tc.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 7, padding: '11px 13px',
              }}>
                <p className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', opacity: 0.6, margin: '0 0 6px' }}>
                  {tc.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--text)' }}>{tc.input}</code>
                  <span style={{ color: 'var(--border-lit)' }}>→</span>
                  <code className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--green)' }}>{tc.expected}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  // O KataSolver fica no mesmo lugar da árvore nos dois layouts. Assim, cruzar o
  // breakpoint (girar o celular) não desmonta o solver nem perde o código. No
  // celular as duas caixas em volta somem com `display: contents`.
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: isMobile ? 'relative' : undefined }}>
      <div style={{ height: 3, background: diffColor, flexShrink: 0 }} />
      {isMobile ? mobileHeader : desktopHeader}

      <div style={isMobile ? { display: 'contents' } : { flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!isMobile && enunciadoDesktop}
        <div style={isMobile ? { display: 'contents' } : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <KataSolver
            key={exercise.id}
            exercise={exercise}
            mode="page"
            onActivity={onActivity}
            onGradeState={onGradeState}
            onOpenSolutions={voltarParaSobre}
            onToggleChat={toggleChat}
            chatOpen={showChat}
          />
          {!isMobile && showChat && chatDesktop}
        </div>
      </div>

      {isMobile && showChat && chatMobile}
      {isMobile && showEnunciado && enunciadoMobile}
    </div>
  )
}

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { usePyodide, type TestResult } from '../hooks/usePyodide'
import { ChatPanel } from '../components/ChatPanel'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { DIFF_COLOR, renderDesc, type ExerciseData } from '../lib/exercise'
import api from '../api/client'

/**
 * Tela de resolver — /exercise/:slug/solve. O enunciado mora na página "sobre";
 * aqui ele só aparece sob demanda, para o editor ficar com a tela inteira.
 */

/**
 * Os caracteres que Python mais usa vivem em camadas secundárias do teclado do
 * celular: cada `:` `(` `[` `_` `*` `"` custa uma troca de camada, e indentação
 * não existe. Trazer para um toque é o que separa "digitar código no celular é
 * ruim" de "é impossível". `voltar` põe o cursor dentro do par recém-inserido.
 */
const TOKENS: { rotulo: string; inserir: string; voltar?: number }[] = [
  { rotulo: '⇥',      inserir: '    ' },
  { rotulo: ':',      inserir: ':' },
  { rotulo: '()',     inserir: '()', voltar: 1 },
  { rotulo: '[]',     inserir: '[]', voltar: 1 },
  { rotulo: '""',     inserir: '""', voltar: 1 },
  { rotulo: '_',      inserir: '_' },
  { rotulo: '*',      inserir: '*' },
  { rotulo: '=',      inserir: '=' },
  { rotulo: '.',      inserir: '.' },
  { rotulo: 'return', inserir: 'return ' },
  { rotulo: 'def',    inserir: 'def ' },
  { rotulo: 'if',     inserir: 'if ' },
  { rotulo: 'for',    inserir: 'for ' },
  { rotulo: 'in',     inserir: 'in ' },
  { rotulo: 'not',    inserir: 'not ' },
  { rotulo: 'None',   inserir: 'None' },
]

export default function ExercisePage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const [exercise, setExercise] = useState<ExerciseData | null>(null)
  const [code, setCode] = useState('')
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [runType, setRunType] = useState<'test' | 'submit' | null>(null)
  const [running, setRunning] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showEnunciado, setShowEnunciado] = useState(false)
  const [painelAberto, setPainelAberto] = useState(false)
  const [startTime] = useState(Date.now())
  const { loading: pyLoading, load: loadPy, runTests } = usePyodide()

  const editorRef = useRef<any>(null)
  const [teclado, setTeclado] = useState(0)

  useEffect(() => {
    if (!slug) return
    setResults(null); setSubmitted(false); setRunType(null); setPainelAberto(false)
    api.get(`/exercises/${slug}`).then(r => {
      setExercise(r.data)
      setCode(r.data.stub)
    })
    loadPy()
  }, [slug, loadPy])

  // No iOS o teclado não redimensiona o layout viewport, só o visual. Sem medir
  // isso, a barra de tokens — que é o ponto todo — fica atrás do teclado.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !isMobile) return
    const medir = () => {
      const coberto = window.innerHeight - vv.height - vv.offsetTop
      setTeclado(coberto > 80 ? Math.round(coberto) : 0)
    }
    vv.addEventListener('resize', medir)
    vv.addEventListener('scroll', medir)
    medir()
    return () => {
      vv.removeEventListener('resize', medir)
      vv.removeEventListener('scroll', medir)
    }
  }, [isMobile])

  const inserirToken = useCallback((texto: string, voltar = 0) => {
    const ed = editorRef.current
    if (!ed) return
    ed.executeEdits('tokens', [{ range: ed.getSelection(), text: texto, forceMoveMarkers: true }])
    if (voltar) {
      const p = ed.getPosition()
      ed.setPosition({ lineNumber: p.lineNumber, column: p.column - voltar })
    }
    ed.focus()   // manter o foco mantém o teclado aberto entre um toque e outro
  }, [])

  const handleTest = useCallback(async () => {
    if (!exercise) return
    setRunning(true); setRunType('test'); setPainelAberto(true)
    try {
      const visible = exercise.test_cases.filter(tc => tc.visible)
      setResults(await runTests(code, exercise.stub, visible))
    } finally {
      setRunning(false)
    }
  }, [exercise, code, runTests])

  const handleSubmit = useCallback(async () => {
    if (!exercise || running) return
    setRunning(true); setRunType('submit'); setPainelAberto(true)
    try {
      const allResults = await runTests(code, exercise.stub, exercise.test_cases)
      setResults(allResults)
      const passed = allResults.filter(r => r.passed).length
      if (passed === allResults.length) {
        await api.post('/submissions', {
          exercise_id: exercise.id, code,
          status: 'passed',
          test_results: allResults,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        })
        setSubmitted(true)
      }
    } finally {
      setRunning(false)
    }
  }, [exercise, code, runTests, startTime, running])

  const passedCount = results?.filter(r => r.passed).length ?? 0
  const totalCount = results?.length ?? 0
  const allPassed = results ? passedCount === totalCount : false
  const hiddenCount = exercise ? exercise.test_cases.filter(tc => !tc.visible).length : 0

  if (!slug || !exercise) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="f-mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
        {!slug ? 'carregando...' : 'carregando exercício...'}
      </span>
    </div>
  )

  const diffColor = DIFF_COLOR[exercise.difficulty] || 'var(--muted)'
  const voltarParaSobre = () => navigate(`/exercise/${exercise.slug}`)

  const editor = (
    <Editor
      height="100%"
      defaultLanguage="python"
      value={code}
      onChange={v => setCode(v || '')}
      onMount={ed => { editorRef.current = ed }}
      theme="vs-dark"
      options={{
        // 16px no celular por dois motivos: abaixo disso o iOS dá zoom ao focar
        // e o layout pula, e 13px em 375px é ilegível.
        fontSize: isMobile ? 16 : 13,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: isMobile ? 26 : 22,
        lineNumbersMinChars: isMobile ? 2 : 3,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        padding: { top: isMobile ? 10 : 16, bottom: isMobile ? 10 : 16 },
        wordWrap: 'on',
        overviewRulerLanes: 0,
        folding: false,
        // O popup de sugestão cobre metade de uma tela de 375px e disputa o
        // mesmo espaço da barra de tokens.
        quickSuggestions: !isMobile,
        suggestOnTriggerCharacters: !isMobile,
        scrollbar: {
          verticalScrollbarSize: isMobile ? 10 : 6,
          horizontalScrollbarSize: isMobile ? 10 : 6,
        },
        automaticLayout: true,
      }}
    />
  )

  const listaResultados = results && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {results.map((r, i) => {
        const tc = exercise.test_cases.find(t => t.id === r.id) ?? exercise.test_cases[i]
        return (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 7,
            background: r.passed ? 'rgba(63,185,80,0.04)' : 'rgba(248,81,73,0.04)',
            border: `1px solid ${r.passed ? 'rgba(63,185,80,0.18)' : 'rgba(248,81,73,0.18)'}`,
            display: 'flex', gap: 10,
          }}>
            <span style={{ color: r.passed ? 'var(--green)' : 'var(--red)', flexShrink: 0, paddingTop: 1 }}>
              {r.passed
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              }
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, marginBottom: 3 }}>
                {tc?.description ?? `test ${i + 1}`}
              </p>
              {r.passed
                ? <p className="f-mono" style={{ fontSize: 12, color: 'var(--green)', margin: 0 }}>{r.output}</p>
                : <>
                    <p className="f-mono" style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>
                      recebeu: <span style={{ color: 'var(--text)' }}>{r.output}</span>
                    </p>
                    <p className="f-mono" style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>
                      esperava: <span style={{ color: 'var(--green)' }}>{tc?.expected ?? r.expected}</span>
                    </p>
                  </>
              }
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Desktop: split 38/62 ───────────────────────────────────────────────────
  if (!isMobile) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 3, background: diffColor, flexShrink: 0 }} />

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
          <span className="f-mono" style={{ fontSize: 10 }}>sobre o desafio</span>
        </button>

        <div style={{ width: 1, height: 12, background: 'var(--border)' }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
          borderRadius: 4, background: `${diffColor}14`, border: `1px solid ${diffColor}30`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: diffColor, letterSpacing: '0.05em', fontFamily: 'var(--f-mono)' }}>
            {exercise.difficulty}
          </span>
        </div>

        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exercise.title}
        </span>

        {pyLoading && (
          <span className="f-mono" style={{ fontSize: 10, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            python
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: '38%', flexShrink: 0, overflowY: 'auto',
          padding: '24px 26px 24px 22px', borderRight: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)' }}
            dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />
          <div style={{ marginTop: 28 }}>
            <p className="section-label" style={{ marginBottom: 10 }}>casos de teste</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exercise.test_cases.filter(tc => tc.visible).map(tc => (
                <div key={tc.id} className="card" style={{ padding: '10px 14px' }}>
                  <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, marginBottom: 5 }}>
                    {tc.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <code className="f-mono" style={{ fontSize: 11, color: 'var(--text)' }}>{tc.input}</code>
                    <span style={{ color: 'var(--border-lit)' }}>→</span>
                    <code className="f-mono" style={{ fontSize: 11, color: 'var(--green)' }}>{tc.expected}</code>
                  </div>
                </div>
              ))}
              {hiddenCount > 0 && (
                <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.4, margin: '4px 0 0' }}>
                  + {hiddenCount} caso{hiddenCount !== 1 ? 's' : ''} oculto{hiddenCount !== 1 ? 's' : ''} — revelados no envio
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0 }}>{editor}</div>

          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
          }}>
            <button
              onClick={handleTest}
              disabled={running || pyLoading || submitted}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 5,
                cursor: running || pyLoading || submitted ? 'not-allowed' : 'pointer',
                background: 'transparent', border: '1px solid var(--border-lit)',
                color: running && runType === 'test' ? 'var(--cyan)' : 'var(--muted)',
                fontSize: 12, fontFamily: 'var(--f-mono)',
                transition: 'all 120ms', opacity: submitted ? 0.4 : 1,
              }}
            >
              {running && runType === 'test'
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> rodando…</>
                : <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    rodar
                  </>
              }
            </button>

            {!submitted ? (
              <button onClick={handleSubmit} disabled={running || pyLoading}
                className="btn btn-cyan" style={{ opacity: running || pyLoading ? 0.6 : 1 }}>
                {running && runType === 'submit'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                      enviando…
                    </span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      enviar
                    </span>
                }
              </button>
            ) : (
              <button onClick={voltarParaSobre} className="btn" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)',
                color: 'var(--green)', cursor: 'pointer',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                ver soluções
              </button>
            )}

            <div style={{ flex: 1 }} />

            {results && (
              <span className="f-mono" style={{ fontSize: 11, color: allPassed ? 'var(--green)' : 'var(--red)' }}>
                {passedCount}/{totalCount}
                {runType === 'test' && <span style={{ color: 'var(--muted)', marginLeft: 4 }}>visíveis</span>}
              </span>
            )}

            <button
              onClick={() => setShowChat(v => !v)}
              title="Chat com IA"
              style={{
                width: 28, height: 28, borderRadius: 5, flexShrink: 0,
                background: showChat ? 'rgba(34,211,238,0.1)' : 'transparent',
                border: `1px solid ${showChat ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                color: showChat ? 'var(--cyan)' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {results && (
            <div style={{
              flexShrink: 0, maxHeight: 200, overflowY: 'auto',
              borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg)',
            }}>
              {listaResultados}
            </div>
          )}

          {showChat && (
            <div style={{
              flexShrink: 0, height: 280, borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
              }}>
                <span className="f-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  IA — {exercise.title}
                </span>
                <button onClick={() => setShowChat(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
              <ChatPanel context={`kata:${exercise.slug}`} style={{ flex: 1, minHeight: 0 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Mobile: o editor fica com a tela toda ──────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 3, background: diffColor, flexShrink: 0 }} />

      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px', height: 44,
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
          fontSize: 9, fontWeight: 700, color: diffColor, fontFamily: 'var(--f-mono)',
          padding: '3px 7px', borderRadius: 4,
          background: `${diffColor}14`, border: `1px solid ${diffColor}30`, flexShrink: 0,
        }}>
          {exercise.difficulty}
        </span>

        <span style={{
          fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {exercise.title}
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

      <div style={{ flex: 1, minHeight: 0 }}>{editor}</div>

      {/* Barra de tokens, logo acima do teclado. */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 6,
        padding: '7px 10px', overflowX: 'auto',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        {TOKENS.map(t => (
          <button
            key={t.rotulo}
            // onPointerDown + preventDefault: um clique normal tiraria o foco do
            // editor e fecharia o teclado a cada token inserido.
            onPointerDown={e => { e.preventDefault(); inserirToken(t.inserir, t.voltar ?? 0) }}
            style={{
              flexShrink: 0, minWidth: 44, height: 44, padding: '0 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 7, color: 'var(--text)', cursor: 'pointer',
              fontSize: 14, fontFamily: 'var(--f-mono)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t.rotulo}
          </button>
        ))}
      </div>

      {/* Ações no terço do polegar. Com o teclado aberto elas saem: quem está
          digitando quer a barra de tokens ali, não os botões. */}
      {teclado === 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', gap: 8,
          padding: '8px 12px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          <button
            onClick={handleTest}
            disabled={running || pyLoading || submitted}
            style={{
              flex: 1, minHeight: 52, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--border-lit)',
              color: running && runType === 'test' ? 'var(--cyan)' : 'var(--text)',
              cursor: running || pyLoading || submitted ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: 'var(--f-mono)', opacity: submitted ? 0.4 : 1,
            }}
          >
            {running && runType === 'test'
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> rodando…</>
              : <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  rodar
                </>
            }
          </button>

          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={running || pyLoading}
              style={{
                flex: 1, minHeight: 52, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--cyan-faint)', border: '1px solid var(--cyan-glow)',
                color: 'var(--cyan)', cursor: running || pyLoading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--f-mono)',
                opacity: running || pyLoading ? 0.6 : 1,
              }}
            >
              {running && runType === 'submit'
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> enviando…</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    enviar
                  </>
              }
            </button>
          ) : (
            <button
              onClick={voltarParaSobre}
              style={{
                flex: 1, minHeight: 52, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)',
                color: 'var(--green)', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--f-mono)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              ver soluções
            </button>
          )}
        </div>
      )}

      {/* Resultado sobe por cima do editor em vez de virar aba: rodar é um
          acontecimento, não um lugar, e o código continua logo atrás. */}
      {painelAberto && results && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
          maxHeight: '62%', display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(12px)',
          borderTop: `2px solid ${allPassed ? 'var(--green)' : 'var(--red)'}`,
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
          animation: 'sheet-up 200ms ease',
        }}>
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span className="f-mono" style={{
              fontSize: 14, fontWeight: 700,
              color: allPassed ? 'var(--green)' : 'var(--red)',
            }}>
              {passedCount}/{totalCount}
            </span>
            <span className="f-mono" style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0 }}>
              {allPassed
                ? (runType === 'submit'
                    ? 'tudo passou — solução aceita'
                    : `visíveis ok · ${hiddenCount} oculto${hiddenCount !== 1 ? 's' : ''} no envio`)
                : 'nem todos passaram'}
            </span>
            <button
              onClick={() => setPainelAberto(false)}
              style={{
                minWidth: 44, minHeight: 44, marginRight: -10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 20, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 20px' }}>
            {listaResultados}
          </div>

          {/* No momento em que passa, o próximo passo tem de estar onde os olhos
              já estão — o painel cobre a barra de ações. */}
          {submitted && (
            <div style={{
              flexShrink: 0, padding: '10px 16px',
              paddingBottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
              borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={voltarParaSobre}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                  color: 'var(--green)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, fontFamily: 'var(--f-mono)',
                }}
              >
                ver soluções
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat da IA no contexto deste kata, em folha inteira. */}
      {showChat && (
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
                fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
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
      )}

      {/* Enunciado sob demanda, sem sair da tela nem perder o código. */}
      {showEnunciado && (
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
                fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
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
              <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}
                dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />
              <p className="f-mono" style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
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
                    <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, margin: '0 0 6px' }}>
                      {tc.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <code className="f-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{tc.input}</code>
                      <span style={{ color: 'var(--border-lit)' }}>→</span>
                      <code className="f-mono" style={{ fontSize: 12, color: 'var(--green)' }}>{tc.expected}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { usePyodide, type TestResult } from '../hooks/usePyodide'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { summarizeResults } from '../lib/kataResults'
import type { ExerciseData } from '../lib/exercise'
import api from '../api/client'

/**
 * The one place that solves a kata: editor, grader and the only POST /submissions.
 * `page` is /exercise/:slug/solve; `lesson` is the kata step of a course lesson.
 * Navigation, the title check and the chat stay with the caller.
 */

export type VerifyResult = 'passed' | 'failed' | 'post_error' | 'grader_error' | 'busy'

export type KataSolverHandle = {
  /** Whole suite. POST /submissions only on a full pass with a 2xx answer.
   *  The "already completed" shortcut exists only in lesson mode. */
  verify: () => Promise<VerifyResult>
}

export type KataSolverProps = {
  exercise: ExerciseData
  mode: 'page' | 'lesson'
  onAccepted?: () => void
  onKeyboardOpen?: (open: boolean) => void
  /** One callback. The page reads pyLoading for its indicator; the lesson disables its footer with pyLoading || running. */
  onActivity?: (activity: { pyLoading: boolean; running: boolean }) => void
  /** page. ExercisePage navigates to `/exercise/${slug}`. The lesson does not pass it. */
  onOpenSolutions?: () => void
  /** page. ExercisePage opens or closes the ChatPanel. The lesson does not pass it. */
  onToggleChat?: () => void
  /** page. Paints the desktop chat icon as active. */
  chatOpen?: boolean
  /** page. ExercisePage paints the check with user_status === completed || allPassed. Do not use accepted for that check. */
  onGradeState?: (state: { allPassed: boolean; accepted: boolean }) => void
}

const GRADER_ERROR = 'Não foi possível rodar os testes. O código continua no editor.'
const POST_ERROR = 'Não foi possível registrar esta solução. O código continua no editor.'

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

type CodeEditor = Parameters<OnMount>[0]

export const KataSolver = forwardRef<KataSolverHandle, KataSolverProps>(function KataSolver(
  { exercise, mode, onAccepted, onKeyboardOpen, onActivity, onOpenSolutions, onToggleChat, chatOpen = false, onGradeState },
  ref,
) {
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const [code, setCode] = useState(exercise.stub)
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [runType, setRunType] = useState<'test' | 'submit' | null>(null)
  const [running, setRunning] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [painelAberto, setPainelAberto] = useState(false)
  const [startTime] = useState(() => Date.now())
  const { loading: pyLoading, load: loadPy, runTests } = usePyodide()

  const editorRef = useRef<CodeEditor | null>(null)
  const [teclado, setTeclado] = useState(0)

  useEffect(() => { loadPy() }, [loadPy])

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

  const { passedCount, totalCount, allPassed } = summarizeResults(results)
  const hiddenCount = exercise.test_cases.filter(tc => !tc.visible).length

  useEffect(() => { onKeyboardOpen?.(teclado > 0) }, [teclado, onKeyboardOpen])
  useEffect(() => { onActivity?.({ pyLoading, running }) }, [pyLoading, running, onActivity])
  useEffect(() => { onGradeState?.({ allPassed, accepted }) }, [allPassed, accepted, onGradeState])

  const inserirToken = useCallback((texto: string, voltar = 0) => {
    const ed = editorRef.current
    if (!ed) return
    ed.executeEdits('tokens', [{ range: ed.getSelection()!, text: texto, forceMoveMarkers: true }])
    if (voltar) {
      const p = ed.getPosition()!
      ed.setPosition({ lineNumber: p.lineNumber, column: p.column - voltar })
    }
    ed.focus()   // manter o foco mantém o teclado aberto entre um toque e outro
  }, [])

  const handleTest = useCallback(async () => {
    setRunning(true); setRunType('test'); setPainelAberto(true); setRunError(null)
    try {
      const visible = exercise.test_cases.filter(tc => tc.visible)
      setResults(await runTests(code, exercise.stub, visible))
    } finally {
      setRunning(false)
    }
  }, [exercise, code, runTests])

  const verify = useCallback(async (): Promise<VerifyResult> => {
    if (running) return 'busy'
    if (mode === 'lesson' && (accepted || exercise.user_status === 'completed')) return 'passed'
    setRunning(true); setRunType('submit'); setPainelAberto(true); setRunError(null)
    try {
      let allResults: TestResult[]
      try {
        allResults = await runTests(code, exercise.stub, exercise.test_cases)
      } catch {
        setRunError(GRADER_ERROR)
        return 'grader_error'
      }
      setResults(allResults)
      if (!summarizeResults(allResults).allPassed) return 'failed'
      try {
        await api.post('/submissions', {
          exercise_id: exercise.id, code,
          status: 'passed',
          test_results: allResults,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        })
      } catch {
        setRunError(POST_ERROR)
        return 'post_error'
      }
      setAccepted(true)
      onAccepted?.()
      return 'passed'
    } finally {
      setRunning(false)
    }
  }, [running, mode, accepted, exercise, code, runTests, startTime, onAccepted])

  useImperativeHandle(ref, () => ({ verify }), [verify])

  if (mode === 'lesson') return null

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

  const avisoErro = runError && (
    <p role="alert" className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--red)', margin: results ? '0 0 8px' : 0 }}>
      {runError}
    </p>
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
              <p className="f-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', opacity: 0.6, marginBottom: 3 }}>
                {tc?.description ?? `test ${i + 1}`}
              </p>
              {r.passed
                ? <p className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--green)', margin: 0 }}>{r.output}</p>
                : <>
                    <p className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--red)', margin: 0 }}>
                      recebeu: <span style={{ color: 'var(--text)' }}>{r.output}</span>
                    </p>
                    <p className="f-mono" style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--muted)', margin: '2px 0 0' }}>
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

  // ── Desktop: a coluna da direita do split 38/62 ─────────────────────────────
  if (!isMobile) return (
    <>
      <div style={{ flex: 1, minHeight: 0 }}>{editor}</div>

      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        <button
          onClick={handleTest}
          disabled={running || pyLoading || accepted}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 5,
            cursor: running || pyLoading || accepted ? 'not-allowed' : 'pointer',
            background: 'transparent', border: '1px solid var(--border-lit)',
            color: running && runType === 'test' ? 'var(--cyan)' : 'var(--muted)',
            fontSize: isMobile ? 'var(--fs-sm)' : 12, fontFamily: 'var(--f-mono)',
            transition: 'all 120ms', opacity: accepted ? 0.4 : 1,
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

        {!accepted ? (
          <button onClick={verify} disabled={running || pyLoading}
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
          <button onClick={onOpenSolutions} className="btn" style={{
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
          <span className="f-mono" style={{ fontSize: 'var(--fs-sm)', color: allPassed ? 'var(--green)' : 'var(--red)' }}>
            {passedCount}/{totalCount}
            {runType === 'test' && <span style={{ color: 'var(--muted)', marginLeft: 4 }}>visíveis</span>}
          </span>
        )}

        <button
          onClick={onToggleChat}
          title="Chat com IA"
          style={{
            width: isMobile ? 'var(--ctl-icon)' : 28, height: isMobile ? 'var(--ctl-icon)' : 28, borderRadius: 5, flexShrink: 0,
            background: chatOpen ? 'rgba(34,211,238,0.1)' : 'transparent',
            border: `1px solid ${chatOpen ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
            color: chatOpen ? 'var(--cyan)' : 'var(--muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 120ms',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {(results || runError) && (
        <div style={{
          flexShrink: 0, maxHeight: 200, overflowY: 'auto',
          borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg)',
        }}>
          {avisoErro}
          {listaResultados}
        </div>
      )}
    </>
  )

  // ── Mobile: o editor fica com a tela toda ──────────────────────────────────
  return (
    <>
      <div style={{ flex: 1, minHeight: 0 }}>{editor}</div>

      {/* Barra de tokens, logo acima do teclado. */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 6,
        padding: isMobile ? '7px var(--sp-5)' : '7px 10px', overflowX: 'auto',
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
              fontSize: isMobile ? 'var(--fs-base)' : 14, fontFamily: 'var(--f-mono)',
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
          padding: isMobile ? '8px var(--sp-5)' : '8px 12px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          <button
            onClick={handleTest}
            disabled={running || pyLoading || accepted}
            style={{
              flex: 1, minHeight: isMobile ? 'var(--ctl-primary)' : 52, borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--border-lit)',
              color: running && runType === 'test' ? 'var(--cyan)' : 'var(--text)',
              cursor: running || pyLoading || accepted ? 'not-allowed' : 'pointer',
              fontSize: 'var(--fs-base)', fontFamily: 'var(--f-mono)', opacity: accepted ? 0.4 : 1,
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

          {!accepted ? (
            <button
              onClick={verify}
              disabled={running || pyLoading}
              style={{
                flex: 1, minHeight: isMobile ? 'var(--ctl-primary)' : 52, borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--cyan-faint)', border: '1px solid var(--cyan-glow)',
                color: 'var(--cyan)', cursor: running || pyLoading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--fs-base)', fontWeight: 700, fontFamily: 'var(--f-mono)',
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
              onClick={onOpenSolutions}
              style={{
                flex: 1, minHeight: isMobile ? 'var(--ctl-primary)' : 52, borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)',
                color: 'var(--green)', cursor: 'pointer',
                fontSize: 'var(--fs-base)', fontWeight: 700, fontFamily: 'var(--f-mono)',
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
      {painelAberto && (results || runError) && (
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
              fontSize: isMobile ? 'var(--fs-base)' : 14, fontWeight: 700,
              color: allPassed ? 'var(--green)' : 'var(--red)',
            }}>
              {passedCount}/{totalCount}
            </span>
            <span className="f-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', flex: 1, minWidth: 0 }}>
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
            {avisoErro}
            {listaResultados}
          </div>

          {/* No momento em que passa, o próximo passo tem de estar onde os olhos
              já estão — o painel cobre a barra de ações. */}
          {accepted && (
            <div style={{
              flexShrink: 0, padding: '10px 16px',
              paddingBottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
              borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={onOpenSolutions}
                style={{
                  width: '100%', minHeight: isMobile ? 'var(--ctl-primary)' : 52, borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                  color: 'var(--green)', cursor: 'pointer',
                  fontSize: 'var(--fs-base)', fontWeight: 700, fontFamily: 'var(--f-mono)',
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
    </>
  )
})

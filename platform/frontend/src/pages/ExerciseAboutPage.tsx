import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding, MOBILE_NAV_SPACE } from '../lib/layout'
import { DIFF_COLOR, renderDesc, type ExerciseData } from '../lib/exercise'
import api from '../api/client'

/**
 * Página "sobre o desafio": enunciado, casos visíveis, dicas, soluções e fórum.
 * Resolver mora em /exercise/:slug/solve — separar as duas é o que faz o editor
 * caber no celular, porque ele deixa de disputar a tela com o enunciado.
 */

function Secao({ label, extra, children }: {
  label: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 12,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
          textTransform: 'uppercase', color: 'rgba(240,240,240,0.45)',
          fontFamily: 'var(--f-mono)',
        }}>
          {label}
        </span>
        {extra}
      </div>
      {children}
    </div>
  )
}

/** Estado vazio de seção que ainda não tem backend. Diz o que falta, sem prometer. */
function Vazio({ texto }: { texto: string }) {
  return (
    <div style={{
      padding: '22px 16px', textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 8,
      color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--f-mono)',
    }}>
      {texto}
    </div>
  )
}

export default function ExerciseAboutPage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [exercise, setExercise] = useState<ExerciseData | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [showHints, setShowHints] = useState(false)

  useEffect(() => {
    if (!slug) return
    setErro(null)
    api.get(`/exercises/${slug}`)
      .then(r => setExercise(r.data))
      .catch(() => setErro('não foi possível carregar este kata.'))
  }, [slug])

  if (erro) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <span className="f-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{erro}</span>
      <button onClick={() => navigate('/exercise')} style={{
        minHeight: 44, padding: '0 18px', borderRadius: 6, cursor: 'pointer',
        background: 'var(--cyan-faint)', border: '1px solid var(--cyan-glow)',
        color: 'var(--cyan)', fontSize: 12, fontFamily: 'var(--f-mono)',
      }}>
        voltar para a lista
      </button>
    </div>
  )

  if (!exercise) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="f-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>carregando…</span>
    </div>
  )

  const cor = DIFF_COLOR[exercise.difficulty] || 'var(--muted)'
  const visiveis = exercise.test_cases.filter(tc => tc.visible)
  const ocultos = exercise.test_cases.length - visiveis.length

  const acao = (
    <button
      onClick={() => navigate(`/exercise/${exercise.slug}/solve`)}
      style={{
        width: isMobile ? '100%' : undefined,
        minHeight: 52, padding: '0 24px', borderRadius: 8, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        background: 'var(--cyan-faint)', border: `1px solid ${cor}55`,
        color: cor, fontSize: 14, fontWeight: 700, fontFamily: 'var(--f-mono)',
        boxShadow: `0 0 22px ${cor}22`,
        transition: 'background 130ms, box-shadow 130ms',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      fazer o desafio
    </button>
  )

  const conteudo = (
    <>
      {/* Cabeçalho do kata */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 56, height: 56, flexShrink: 0, position: 'relative' }}>
          <svg width="56" height="56" viewBox="0 0 54 54">
            <polygon points="27,2 51,14 51,40 27,52 3,40 3,14"
              fill={`${cor}14`} stroke={cor} strokeWidth="1.5" />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: cor, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>
              {exercise.difficulty.replace('kyu', '')}
            </span>
            <span style={{ fontSize: 8, fontWeight: 600, color: cor, fontFamily: 'var(--f-mono)', opacity: 0.75, lineHeight: 1.4 }}>
              kyu
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 19 : 22, fontWeight: 800, margin: '2px 0 8px',
            letterSpacing: '-0.02em', lineHeight: 1.25, color: 'var(--text)',
          }}>
            {exercise.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="f-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {exercise.module}
            </span>
            {exercise.tags.map(t => (
              <span key={t} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                color: 'var(--muted)',
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!isMobile && <div style={{ marginTop: 22 }}>{acao}</div>}

      <Secao label="descrição">
        <div style={{ fontSize: isMobile ? 14 : 13, lineHeight: 1.8, color: 'var(--muted)' }}
          dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />
      </Secao>

      <Secao
        label="casos de teste"
        extra={ocultos > 0 ? (
          <span className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
            +{ocultos} oculto{ocultos !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visiveis.map(tc => (
            <div key={tc.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '11px 13px',
            }}>
              <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, margin: '0 0 6px' }}>
                {tc.description}
              </p>
              {/* entrada → esperado numa linha: é isso que se compara de relance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <code className="f-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{tc.input}</code>
                <span style={{ color: 'var(--border-lit)', fontSize: 12 }}>→</span>
                <code className="f-mono" style={{ fontSize: 12, color: 'var(--green)' }}>{tc.expected}</code>
              </div>
            </div>
          ))}
          {visiveis.length === 0 && <Vazio texto="nenhum caso visível — todos são revelados no envio." />}
        </div>
      </Secao>

      {exercise.hints.length > 0 && (
        <Secao label="dicas">
          <button
            onClick={() => setShowHints(v => !v)}
            aria-expanded={showHints}
            style={{
              minHeight: 44, width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid var(--border)', borderRadius: 7,
              padding: '0 13px', cursor: 'pointer',
              color: showHints ? 'var(--cyan)' : 'var(--muted)',
              fontSize: 12, fontFamily: 'var(--f-mono)',
              transition: 'color 130ms, border-color 130ms',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ transition: 'transform 200ms', transform: showHints ? 'rotate(180deg)' : 'none' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showHints ? 'ocultar dicas' : `ver ${exercise.hints.length} dica${exercise.hints.length !== 1 ? 's' : ''}`}
          </button>
          {showHints && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exercise.hints.map((h, i) => (
                <div key={i} style={{
                  background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)',
                  borderRadius: 7, padding: '11px 13px',
                }}>
                  <p className="f-mono" style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--cyan)' }}>{i + 1}.</span> {h}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Secao>
      )}

      {/* Slice 3: a API remove `solution` de propósito, e não há submissions de
          outros usuários ainda. A seção existe para o lugar estar reservado. */}
      <Secao label="soluções">
        <Vazio texto="resolva o desafio para ver como outras pessoas resolveram." />
      </Secao>

      {/* Slice 4: não há tabela de fórum no schema. */}
      <Secao label="fórum">
        <Vazio texto="nenhuma discussão ainda." />
      </Secao>
    </>
  )

  if (!isMobile) return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: pagePadding('44px 48px 80px', isMobile, true) }}>
        {conteudo}
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* O padding de baixo abre espaço para a barra fixa não cobrir o fórum. */}
        <div style={{ padding: pagePadding('24px 26px 12px', isMobile, true) }}>
          {conteudo}
        </div>
      </div>

      {/* Ação principal fixa no terço do polegar: numa página que rola, ela
          precisa estar sempre alcançável, não só no fim do scroll.
          O padding de baixo é o espaço da dock — ela é `fixed`, então sem isso
          a barra fica atrás dela. */}
      <div style={{
        flexShrink: 0,
        paddingTop: 10, paddingLeft: 16, paddingRight: 16,
        paddingBottom: `calc(10px + ${MOBILE_NAV_SPACE})`,
        borderTop: '1px solid var(--border)',
        background: 'rgba(10,10,10,0.94)',
        backdropFilter: 'blur(12px)',
      }}>
        {acao}
      </div>
    </div>
  )
}

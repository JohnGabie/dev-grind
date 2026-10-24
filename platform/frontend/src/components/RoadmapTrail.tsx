import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR } from '../lib/courseDisplay'
import { actionLabel } from '../lib/courseProgress'
import type { TrailStage } from '../lib/roadmapTrail'

const MARKER = 22

function Marker({ stage }: { stage: TrailStage }) {
  const color = STATE_COLOR[stage.state]
  const base = { width: MARKER, height: MARKER, borderRadius: '50%', boxSizing: 'border-box' as const, flexShrink: 0, border: `2px solid ${color}` }
  if (stage.state === 'concluído') {
    return (
      <span aria-hidden="true" style={{ ...base, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
        </svg>
      </span>
    )
  }
  const fill = stage.state === 'em andamento' ? `linear-gradient(to top, ${color} 50%, transparent 50%)` : 'none'
  return <span aria-hidden="true" style={{ ...base, background: fill }} />
}

export default function RoadmapTrail({ stages, onContinue }: { stages: TrailStage[]; onContinue: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {stages.map((stage, index) => {
        const last = index === stages.length - 1
        return (
          <li key={stage.id} style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--sp-3)' }}>
              <Marker stage={stage} />
              {!last && <span aria-hidden="true" style={{ flex: 1, width: 2, marginTop: 4, background: 'var(--border)' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 'var(--sp-5)' }}>
              <Link
                to={`/courses/${stage.id}`}
                aria-current={stage.current ? 'step' : undefined}
                style={{ display: 'block', boxSizing: 'border-box', minHeight: 'var(--ctl-md)', padding: 'var(--sp-2) 0', color: 'inherit', textDecoration: 'none' }}
              >
                <span style={{ display: 'block', fontSize: isMobile ? 'var(--fs-lg)' : 18, fontWeight: 700, overflowWrap: 'anywhere' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 'var(--fs-sm)' }}>{stage.position}. </span>
                  {stage.title}
                </span>
                <span style={{ display: 'block', fontSize: size, margin: 'var(--sp-1) 0 var(--sp-2)' }}>
                  <span>{stage.done} de {stage.total} lições · {stage.percent}%</span>
                  <span style={{ color: STATE_COLOR[stage.state] }}> · {stage.state}</span>
                </span>
                <span aria-hidden="true" style={{ display: 'block' }}>
                  <ProgressBar done={stage.done} total={stage.total} label={`${stage.title}: ${stage.done} de ${stage.total} lições`} done100={stage.state === 'concluído'} />
                </span>
              </Link>
              {stage.current && (
                <button
                  type="button"
                  onClick={onContinue}
                  style={{
                    background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: 'var(--ctl-md)', marginTop: 'var(--sp-2)', boxSizing: 'border-box',
                  }}
                >
                  {actionLabel(stage.state)}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

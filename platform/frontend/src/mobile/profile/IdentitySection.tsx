import { BackgroundBg } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import { honorMissing, nextRank, rankColor } from '../rank'
import SectionState from '../SectionState'
import { Stat, StatRow } from '../Stat'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'

const RING = 72
const R = 30
const CIRC = 2 * Math.PI * R

export default function IdentitySection({ stats }: { stats: Slot<UserStats> }) {
  const { bg } = useCosmetics()
  const s = stats.data

  return (
    <SectionState status={stats.status} onRetry={stats.retry}>
      {s && (() => {
        const color = rankColor(s.rank)
        const next = nextRank(s.rank)
        const chips = [
          { label: `membro há ${s.days_since_joined}d`, bright: false },
          { label: `${s.current_streak}d streak`, bright: s.current_streak > 0 },
          { label: `${s.total_completed} exercícios`, bright: false },
        ]
        return (
          <div>
            <div style={{ position: 'relative', height: 200, width: '100%', overflow: 'hidden' }}>
              {s.user.cover_url
                ? <img src={s.user.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : bg('bg_profile')
                  ? <BackgroundBg config={bg('bg_profile')} />
                  : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}28 0%, ${color}0c 50%, transparent 100%)` }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(10,14,20,0.55) 55%, rgba(10,14,20,0.96) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <div style={{
                  position: 'absolute', inset: 0, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
                }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: '0 var(--sp-5) var(--sp-4)' }}>
                  {s.user.avatar_url
                    ? <img src={s.user.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0, objectFit: 'cover', border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40` }} />
                    : <div style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0, background: 'var(--bg-card)', border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 'var(--fs-xl)', fontWeight: 900 }}>{s.user.name[0]}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 'var(--lh-xl)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.user.name}</h1>
                    <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
                      {chips.map(({ label, bright }) => (
                        <span key={label} style={{
                          fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '2px var(--sp-2)', borderRadius: 'var(--radius-sm)',
                          background: bright ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${bright ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
                          color: bright ? 'var(--cyan)' : 'var(--muted)',
                        }}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: RING, height: RING, flexShrink: 0 }}>
                    <svg width={RING} height={RING} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, s.rank_progress)))} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 20px ${color}80` }}>{s.rank.replace('kyu', '')}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color, opacity: 0.7 }}>kyu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 'var(--sp-4) var(--sp-5) 0' }}>
              {next && (
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
                  faltam {honorMissing(s.honor, s.honor_for_next_rank).toLocaleString('pt-BR')} de honor para {next}
                </div>
              )}
              <StatRow>
                <Stat value={`${Math.round(s.completion_rate * 100)}%`} label="aproveitamento" />
                <Stat value={s.days_active} label="dias ativos" />
                <Stat value={s.honor.toLocaleString('pt-BR')} label="honor" />
              </StatRow>
            </div>
          </div>
        )
      })()}
    </SectionState>
  )
}

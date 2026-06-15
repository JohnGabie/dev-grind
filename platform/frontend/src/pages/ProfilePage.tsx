import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useCosmetics } from '../contexts/CosmeticsContext'
import { BackgroundBg } from '../components/BackgroundRenderer'

interface HeatmapDay { total: number; katas: number; books: number; courses: number }

interface Stats {
  user: { name: string; email: string; avatar_url: string | null; cover_url: string | null; bio: string | null; social_links: Record<string, string>; created_at: string }
  rank: string; rank_progress: number; honor: number; honor_for_next_rank: number
  total_completed: number; total_attempted: number; completion_rate: number
  current_streak: number; days_active: number; days_since_joined: number
  recent_completions: { title: string; slug: string; difficulty: string; submitted_at: string }[]
  heatmap: Record<string, HeatmapDay>
  weekly_summary: { completed_last_7_days: number }
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}
const RANK_ORDER = ['8kyu', '7kyu', '6kyu', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu']

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6), d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d atrás`
  if (h > 0) return `${h}h atrás`
  return 'agora'
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
function Heatmap({ heatmap }: { heatmap: Record<string, HeatmapDay> }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; data: HeatmapDay } | null>(null)

  const CELL = 10, GAP = 2, LEFT_PAD = 24
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const rangeStart = new Date(today); rangeStart.setDate(today.getDate() - 364)
  const gridStart = new Date(rangeStart); gridStart.setDate(rangeStart.getDate() - rangeStart.getDay())

  type Cell = { date: string; data: HeatmapDay; isToday: boolean; inRange: boolean }
  const weeks: (Cell | null)[][] = []
  let week: (Cell | null)[] = []
  const cur = new Date(gridStart)
  while (cur <= today) {
    const key = cur.toISOString().split('T')[0]
    week.push({ date: key, data: heatmap[key] ?? { total: 0, katas: 0, books: 0, courses: 0 }, isToday: cur.getTime() === today.getTime(), inRange: cur >= rangeStart })
    if (week.length === 7) { weeks.push(week); week = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week) }

  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((wk, wi) => {
    const first = wk.find(c => c?.inRange)
    if (first) {
      const m = new Date(first.date + 'T12:00:00').getMonth()
      if (m !== lastMonth) { monthLabels.push({ col: wi, label: MONTHS[m] }); lastMonth = m }
    }
  })

  const cellColor = (cell: Cell | null) => {
    if (!cell?.inRange) return 'transparent'
    if (cell.isToday && cell.data.total === 0) return 'rgba(34,211,238,0.13)'
    const n = cell.data.total
    if (n === 0) return 'rgba(255,255,255,0.05)'
    if (n === 1) return 'rgba(34,211,238,0.30)'
    if (n === 2) return 'rgba(34,211,238,0.52)'
    if (n === 3) return 'rgba(34,211,238,0.74)'
    return 'rgba(34,211,238,0.93)'
  }

  const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflow: 'hidden', userSelect: 'none' }}>
        <div style={{ position: 'relative', paddingTop: 20 }}>

          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <span key={`${col}-${label}`} style={{
              position: 'absolute', top: 2,
              left: LEFT_PAD + col * (CELL + GAP),
              fontSize: 10, color: 'rgba(255,255,255,0.32)',
              fontFamily: 'var(--f-mono)', pointerEvents: 'none',
            }}>{label}</span>
          ))}

          <div style={{ display: 'flex' }}>
            {/* Day labels */}
            <div style={{ width: LEFT_PAD, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{
                  height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 6, fontSize: 9, fontFamily: 'var(--f-mono)',
                  color: i % 2 === 1 ? 'rgba(255,255,255,0.28)' : 'transparent',
                }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', gap: GAP }}>
              {weeks.map((wk, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {wk.map((cell, di) => (
                    <div key={di} style={{
                      width: CELL, height: CELL, borderRadius: 2, flexShrink: 0,
                      background: cellColor(cell),
                      border: cell?.isToday ? '1px solid rgba(34,211,238,0.55)' : 'none',
                      boxSizing: 'border-box',
                      cursor: cell?.inRange ? 'default' : 'auto',
                    }}
                      onMouseEnter={cell?.inRange ? (e) => setTooltip({ x: e.clientX, y: e.clientY, date: cell.date, data: cell.data }) : undefined}
                      onMouseLeave={cell?.inRange ? () => setTooltip(null) : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 56,
          background: 'rgba(12,16,23,0.97)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 7, padding: '8px 12px', pointerEvents: 'none', zIndex: 9999,
          backdropFilter: 'blur(10px)', minWidth: 155, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--f-mono)', marginBottom: 5, textTransform: 'capitalize' }}>
            {fmtDate(tooltip.date)}
          </div>
          {tooltip.data.total === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>sem atividade</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {tooltip.data.katas > 0 && <div style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'var(--f-mono)' }}>{tooltip.data.katas} kata{tooltip.data.katas !== 1 ? 's' : ''}</div>}
              {tooltip.data.books > 0 && <div style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'var(--f-mono)' }}>{tooltip.data.books} livro{tooltip.data.books !== 1 ? 's' : ''}</div>}
              {tooltip.data.courses > 0 && <div style={{ fontSize: 10, color: '#34d399', fontFamily: 'var(--f-mono)' }}>{tooltip.data.courses} aula{tooltip.data.courses !== 1 ? 's' : ''}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Showcase Cards ────────────────────────────────────────────────────────────
function ShowcaseLatest({ completion }: { completion: Stats['recent_completions'][0] | undefined }) {
  const dc = completion ? (DIFF_COLOR[completion.difficulty] || '#525252') : '#525252'
  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)',
      background: completion
        ? `linear-gradient(160deg, ${dc}18 0%, ${dc}06 60%, var(--bg-card) 100%)`
        : 'var(--bg-card)',
      display: 'flex', flexDirection: 'column', height: 180,
      position: 'relative',
    }}>
      <div style={{
        padding: '12px 14px 0',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--f-mono)',
      }}>
        Último exercício
      </div>
      {completion ? (
        <>
          <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{
              fontSize: 15, fontWeight: 700, margin: '0 0 6px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', lineHeight: 1.35, letterSpacing: '-0.02em',
            }}>
              {completion.title}
            </p>
          </div>
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${dc}22`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--f-mono)', letterSpacing: '0.06em',
              padding: '3px 8px', borderRadius: 4,
              background: `${dc}20`, border: `1px solid ${dc}40`, color: dc,
            }}>
              {completion.difficulty}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', marginLeft: 'auto' }}>
              {timeAgo(completion.submitted_at)}
            </span>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>nenhum exercício ainda</span>
        </div>
      )}
    </div>
  )
}

function ShowcaseStreak({ streak, daysActive }: { streak: number; daysActive: number }) {
  const active = streak > 0
  const color = active ? '#f97316' : '#525252'
  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)',
      background: active
        ? `linear-gradient(160deg, ${color}18 0%, ${color}06 60%, var(--bg-card) 100%)`
        : 'var(--bg-card)',
      display: 'flex', flexDirection: 'column', height: 180,
    }}>
      <div style={{
        padding: '12px 14px 0',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--f-mono)',
      }}>
        Sequência
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{
          fontSize: 52, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--f-mono)',
          color: active ? color : 'var(--muted)', letterSpacing: '-0.04em',
        }}>
          {streak}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
          dias consecutivos
        </span>
      </div>
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${color}18`,
        fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', textAlign: 'right',
      }}>
        {daysActive} dias ativos no total
      </div>
    </div>
  )
}

function ShowcaseRank({ rank, rankProgress, honor, nextRank }: {
  rank: string; rankProgress: number; honor: number; nextRank: string | undefined
}) {
  const rankColor = DIFF_COLOR[rank] || '#525252'
  const pct = Math.round(rankProgress * 100)
  const size = 72, cx = 36, cy = 36, r = 28, circ = 2 * Math.PI * r
  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)',
      background: `linear-gradient(160deg, ${rankColor}18 0%, ${rankColor}06 60%, var(--bg-card) 100%)`,
      display: 'flex', flexDirection: 'column', height: 180,
    }}>
      <div style={{
        padding: '12px 14px 0',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--f-mono)',
      }}>
        Nível
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={rankColor} strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: rankColor, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>
              {rank.replace('kyu', '')}
            </span>
            <span style={{ fontSize: 8, color: rankColor, opacity: 0.6, fontFamily: 'var(--f-mono)' }}>kyu</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--f-mono)', color: rankColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {honor.toLocaleString()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>honor</span>
          {nextRank && (
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)', opacity: 0.6 }}>
              → {nextRank} · {pct}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: 'first', label: 'Primeiro Passo', svg: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', cond: (s: Stats) => s.total_completed >= 1, color: '#f97316' },
  { id: 'five', label: 'Cadência', svg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', cond: (s: Stats) => s.total_completed >= 5, color: '#eab308' },
  { id: 'streak3', label: 'Chama', svg: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z', cond: (s: Stats) => s.current_streak >= 3, color: '#ef4444' },
  { id: 'streak7', label: 'Incêndio', svg: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M12 6v6l4 2', cond: (s: Stats) => s.current_streak >= 7, color: '#ef4444' },
  { id: 'active10', label: 'Constante', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5l6-6-1.4-1.4L11 13.2l-2.6-2.6L7 12l4 5z', cond: (s: Stats) => s.days_active >= 10, color: '#22c55e' },
  { id: 'honor30', label: 'Aprendiz', svg: 'M12 15l-4 5h8l-4-5zm0-13C8.1 2 5 5.1 5 9c0 3.9 7 13 7 13s7-9.1 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5z', cond: (s: Stats) => s.honor >= 30, color: '#3b82f6' },
  { id: 'honor120', label: 'Veterano', svg: 'M12 1l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z', cond: (s: Stats) => s.honor >= 120, color: '#a855f7' },
  { id: 'sharpshooter', label: 'Preciso', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm0-12a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z', cond: (s: Stats) => s.total_attempted >= 5 && s.completion_rate >= 0.8, color: '#22d3ee' },
]

function BadgesGrid({ stats }: { stats: Stats }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {BADGE_DEFS.map(badge => {
        const unlocked = badge.cond(stats)
        return (
          <div key={badge.id} title={badge.label} style={{
            width: 40, height: 40, borderRadius: 6, flexShrink: 0,
            background: unlocked ? `${badge.color}18` : 'var(--bg-card)',
            border: `1px solid ${unlocked ? badge.color + '50' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: unlocked ? `0 0 10px ${badge.color}25` : 'none',
            opacity: unlocked ? 1 : 0.25,
            filter: unlocked ? 'none' : 'grayscale(1)',
            transition: 'box-shadow 200ms',
            cursor: 'default',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unlocked ? badge.color : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={badge.svg} />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(240,240,240,0.35)', fontFamily: 'var(--f-mono)',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── Social Links ──────────────────────────────────────────────────────────────
const SOCIALS: { id: string; label: string; color: string; gradient: string[] | null; path: string }[] = [
  {
    id: 'github', label: 'GitHub', color: '#e2e8f0', gradient: null,
    path: 'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.93.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z',
  },
  {
    id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', gradient: null,
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    id: 'twitter', label: 'X', color: '#e2e8f0', gradient: null,
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    id: 'instagram', label: 'Instagram', color: '#e1306c', gradient: ['#833ab4', '#fd1d1d', '#fcb045'],
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
  {
    id: 'discord', label: 'Discord', color: '#5865f2', gradient: null,
    path: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
  },
  {
    id: 'youtube', label: 'YouTube', color: '#ff0000', gradient: null,
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    id: 'steam', label: 'Steam', color: '#66c0f4', gradient: null,
    path: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.452-.397.957-1.497 1.41-2.455 1.015zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z',
  },
]

function SocialLinks({ initialLinks }: { initialLinks: Record<string, string> }) {
  const [links, setLinks] = useState<Record<string, string>>(initialLinks)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const openEdit = (id: string) => {
    setDraft(links[id] ?? '')
    setEditing(id)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const save = async (id: string) => {
    const updated = { ...links, [id]: draft.trim() }
    if (!draft.trim()) delete updated[id]
    try {
      await api.patch('/users/me', { social_links: updated })
      setLinks(updated)
    } finally {
      setEditing(null)
    }
  }

  return (
    <div>
      <SectionLabel label="Redes sociais" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SOCIALS.map(s => {
          const active = !!links[s.id]
          const g = s.gradient
          const bg = active
            ? g ? `linear-gradient(135deg, ${g[0]}1a, ${g[1]}1a, ${g[2]}1a)` : `${s.color}18`
            : 'var(--bg-card)'
          const borderCol = active
            ? g ? `${g[1]}55` : `${s.color}50`
            : 'var(--border)'
          const glow = active
            ? g ? `0 0 10px ${g[0]}22, 0 0 16px ${g[2]}18` : `0 0 10px ${s.color}25`
            : 'none'
          const gradId = `sg-${s.id}`

          return (
            <button
              key={s.id}
              title={active ? links[s.id] : `Adicionar ${s.label}`}
              onClick={() => openEdit(s.id)}
              style={{
                width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                background: bg,
                border: `1px solid ${borderCol}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: glow,
                opacity: active ? 1 : 0.25,
                filter: active ? 'none' : 'grayscale(1)',
                transition: 'box-shadow 200ms, opacity 150ms',
                cursor: 'pointer', padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'none' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = active ? '1' : '0.25'; e.currentTarget.style.filter = active ? 'none' : 'grayscale(1)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill={active && g ? `url(#${gradId})` : active ? s.color : 'var(--muted)'}
              >
                {active && g && (
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={g[0]} />
                      <stop offset="50%" stopColor={g[1]} />
                      <stop offset="100%" stopColor={g[2]} />
                    </linearGradient>
                  </defs>
                )}
                <path d={s.path} />
              </svg>
            </button>
          )
        })}
      </div>

      {editing && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
            {SOCIALS.find(s => s.id === editing)?.label}
          </span>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(editing); if (e.key === 'Escape') setEditing(null) }}
            placeholder="https://..."
            style={{
              flex: 1, height: 28, padding: '0 8px', borderRadius: 5,
              background: 'var(--bg-card)', border: '1px solid rgba(34,211,238,0.3)',
              color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 11, outline: 'none',
            }}
          />
          <button onClick={() => save(editing)} style={{
            height: 28, padding: '0 10px', borderRadius: 5, cursor: 'pointer',
            fontSize: 10, fontFamily: 'var(--f-mono)', fontWeight: 600,
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)', color: 'var(--cyan)',
          }}>ok</button>
          <button onClick={() => setEditing(null)} style={{
            height: 28, padding: '0 8px', borderRadius: 5, cursor: 'pointer',
            fontSize: 10, fontFamily: 'var(--f-mono)',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
          }}>×</button>
        </div>
      )}
    </div>
  )
}

// ── Bio ───────────────────────────────────────────────────────────────────────
function BioSection({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const startEdit = () => {
    setDraft(bio)
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me', { bio: draft })
      setBio(draft.trim())
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const cancel = () => setEditing(false)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(240,240,240,0.35)', fontFamily: 'var(--f-mono)',
        }}>Sobre</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        {!editing && (
          <button onClick={startEdit} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            color: 'var(--muted)', display: 'flex', alignItems: 'center',
            transition: 'color 120ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder="Escreva algo sobre você..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)', border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: 6, padding: '10px 12px', resize: 'vertical',
              color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 13,
              lineHeight: 1.6, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', marginRight: 'auto' }}>
              {draft.length}/300
            </span>
            <button onClick={cancel} style={{
              height: 28, padding: '0 12px', borderRadius: 5, cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--f-mono)', fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
            }}>cancelar</button>
            <button onClick={save} disabled={saving} style={{
              height: 28, padding: '0 12px', borderRadius: 5, cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--f-mono)', fontWeight: 600,
              background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)',
              color: 'var(--cyan)',
            }}>{saving ? '...' : 'salvar'}</button>
          </div>
        </div>
      ) : (
        <p onClick={startEdit} style={{
          fontSize: 13, lineHeight: 1.65, color: bio ? 'var(--text)' : 'var(--muted)',
          fontFamily: 'var(--f-mono)', margin: 0, cursor: 'text',
          fontStyle: bio ? 'normal' : 'italic',
          minHeight: 22,
        }}>
          {bio || 'sem descrição — clique para adicionar'}
        </p>
      )}
    </div>
  )
}

// ── Friends ───────────────────────────────────────────────────────────────────
const MOCK_FRIENDS = [
  { name: 'Bruno Belloni',  rank: '6kyu', online: true,  cover: null as string | null, avatar: null as string | null },
  { name: 'Victor Moraes', rank: '7kyu', online: false, cover: null as string | null, avatar: null as string | null },
  { name: 'Ryan Braga',    rank: '8kyu', online: false, cover: null as string | null, avatar: null as string | null },
]
type Friend = typeof MOCK_FRIENDS[0]

function FriendCard({ friend, x, y }: { friend: Friend; x: number; y: number }) {
  const rc = DIFF_COLOR[friend.rank] || '#525252'
  // Position: appear to the left of the trigger (since sidebar is on the right)
  const cardW = 240
  return (
    <div style={{
      position: 'fixed',
      left: x - cardW - 12,
      top: Math.max(8, y - 20),
      width: cardW,
      background: 'rgb(13,17,24)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 9999,
      boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
    }}>
      {/* Banner */}
      <div style={{
        height: 72, position: 'relative', overflow: 'hidden',
        background: friend.cover
          ? `url(${friend.cover}) center/cover`
          : `linear-gradient(135deg, ${rc}40 0%, ${rc}18 50%, transparent 100%)`,
      }}>
        {/* gradient scrim at bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(13,17,24,0.7) 100%)',
        }} />
      </div>

      {/* Avatar overlapping banner */}
      <div style={{ position: 'relative', padding: '0 14px' }}>
        <div style={{ position: 'absolute', top: -28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 8,
            background: friend.avatar ? undefined : `${rc}20`,
            border: `3px solid rgb(13,17,24)`,
            outline: `2px solid ${rc}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: rc, fontFamily: 'var(--f-mono)',
            overflow: 'hidden',
          }}>
            {friend.avatar
              ? <img src={friend.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : friend.name[0]
            }
          </div>
          {/* status dot */}
          <div style={{
            position: 'absolute', bottom: 1, right: -1,
            width: 13, height: 13, borderRadius: '50%',
            background: friend.online ? '#22c55e' : '#525252',
            border: '3px solid rgb(13,17,24)',
            boxShadow: friend.online ? '0 0 8px #22c55e80' : 'none',
          }} />
        </div>

        {/* kyu badge top-right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, fontFamily: 'var(--f-mono)',
            color: rc, padding: '3px 9px', borderRadius: 5,
            background: `${rc}18`, border: `1px solid ${rc}40`,
          }}>
            {friend.rank}
          </span>
        </div>

        {/* Name + status */}
        <div style={{ paddingTop: 10, paddingBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'var(--f-mono)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            {friend.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: friend.online ? '#22c55e' : '#525252',
              boxShadow: friend.online ? '0 0 5px #22c55e80' : 'none',
            }} />
            <span style={{ fontSize: 10, color: friend.online ? '#22c55e' : '#525252', fontFamily: 'var(--f-mono)' }}>
              {friend.online ? 'online' : 'offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FriendsGrid() {
  const [hovered, setHovered] = useState<{ x: number; y: number; friend: Friend } | null>(null)
  const rankColor = (r: string) => DIFF_COLOR[r] || '#525252'

  return (
    <div>
      <SectionLabel label="Amigos" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {MOCK_FRIENDS.map(friend => (
          <div
            key={friend.name}
            style={{ position: 'relative', cursor: 'default' }}
            onMouseEnter={e => {
              const r = e.currentTarget.getBoundingClientRect()
              setHovered({ x: r.left, y: r.top, friend })
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 6,
              background: friend.avatar ? undefined : `${rankColor(friend.rank)}15`,
              border: `2px solid ${rankColor(friend.rank)}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: rankColor(friend.rank),
              fontFamily: 'var(--f-mono)', overflow: 'hidden',
              boxShadow: friend.online ? `0 0 10px ${rankColor(friend.rank)}25` : 'none',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}>
              {friend.avatar
                ? <img src={friend.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : friend.name[0]
              }
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 11, height: 11, borderRadius: '50%',
              background: friend.online ? '#22c55e' : 'var(--border)',
              border: '2px solid var(--bg)',
              boxShadow: friend.online ? '0 0 6px #22c55e80' : 'none',
            }} />
          </div>
        ))}

        <div style={{
          width: 40, height: 40, borderRadius: 6, cursor: 'pointer',
          background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', fontSize: 18, fontWeight: 300,
          transition: 'border-color 150ms, color 150ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)' }}
        >+</div>
      </div>

      {hovered && <FriendCard friend={hovered.friend} x={hovered.x} y={hovered.y} />}
    </div>
  )
}

// ── Cover adjust types ────────────────────────────────────────────────────────
type CoverAdjust = { x: number; y: number; scale: number }
const ADJUST_KEY = 'cover_adjust'
const defaultAdjust: CoverAdjust = { x: 0, y: 0, scale: 1 }

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { bg } = useCosmetics()
  const [stats, setStats] = useState<Stats | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverHovered, setCoverHovered] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [coverAdjust, setCoverAdjust] = useState<CoverAdjust>(defaultAdjust)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const savedAdjust = useRef<CoverAdjust>(defaultAdjust)

  useEffect(() => {
    api.get('/users/me/stats').then(r => {
      setStats(r.data)
      setCoverUrl(r.data.user.cover_url ?? null)
    })
    const stored = localStorage.getItem(ADJUST_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      setCoverAdjust(parsed)
      savedAdjust.current = parsed
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      setCoverAdjust(prev => ({
        ...prev,
        x: dragStart.current!.ox + (e.clientX - dragStart.current!.mx),
        y: dragStart.current!.oy + (e.clientY - dragStart.current!.my),
      }))
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const onAdjustMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: coverAdjust.x, oy: coverAdjust.y }
  }

  const saveAdjust = () => {
    localStorage.setItem(ADJUST_KEY, JSON.stringify(coverAdjust))
    savedAdjust.current = coverAdjust
    setIsAdjusting(false)
  }

  const cancelAdjust = () => {
    setCoverAdjust(savedAdjust.current)
    setIsAdjusting(false)
  }

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/users/me/cover', form)
      setCoverUrl(res.data.cover_url + '?t=' + Date.now())
      const reset = defaultAdjust
      setCoverAdjust(reset)
      savedAdjust.current = reset
      localStorage.removeItem(ADJUST_KEY)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert('Erro ao enviar capa: ' + (msg || String(err)))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveCover = async () => {
    await api.delete('/users/me/cover')
    setCoverUrl(null)
    setCoverAdjust(defaultAdjust)
    savedAdjust.current = defaultAdjust
    localStorage.removeItem(ADJUST_KEY)
  }

  if (!stats) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>_</span>
    </div>
  )

  const nextRank = RANK_ORDER[RANK_ORDER.indexOf(stats.rank) + 1]
  const rankColor = DIFF_COLOR[stats.rank] || '#525252'
  const coverSrc = coverUrl ?? null

  const btnBase: React.CSSProperties = {
    height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer',
    fontSize: 11, fontWeight: 600, fontFamily: 'var(--f-mono)',
    display: 'flex', alignItems: 'center', gap: 6, transition: 'background 120ms, border-color 120ms',
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>

      {/* ── Cover ──────────────────────────────────────────────────────────── */}
      <div
        style={{ position: 'relative', height: 360, width: '100%', flexShrink: 0, overflow: 'hidden' }}
        onMouseEnter={() => { if (!isAdjusting) setCoverHovered(true) }}
        onMouseLeave={() => { if (!isAdjusting) setCoverHovered(false) }}
      >
        {!coverSrc && bg('bg_profile') && <BackgroundBg config={bg('bg_profile')} />}
        {!coverSrc && !bg('bg_profile') && (
          <div style={{ width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${rankColor}28 0%, ${rankColor}0c 50%, transparent 100%)`,
          }} />
        )}

        {coverSrc && (
          <div
            style={{
              position: 'absolute', inset: 0,
              cursor: isAdjusting ? (isDragging ? 'grabbing' : 'grab') : 'default',
              overflow: 'hidden',
            }}
            onMouseDown={isAdjusting ? onAdjustMouseDown : undefined}
          >
            <img
              draggable={false}
              src={coverSrc}
              alt="capa"
              style={{
                position: 'absolute',
                minWidth: '100%', minHeight: '100%',
                width: 'auto', height: 'auto',
                top: '50%', left: '50%',
                transform: `translate(calc(-50% + ${coverAdjust.x}px), calc(-50% + ${coverAdjust.y}px)) scale(${coverAdjust.scale})`,
                transformOrigin: 'center center',
                userSelect: 'none', pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {/* Gradient for text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 20%, rgba(10,14,20,0.55) 55%, rgba(10,14,20,0.96) 100%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Identity overlaid at bottom of cover */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
          {/* Frosted-glass backdrop — mask fades this layer only, content above is unaffected */}
          <div style={{
            position: 'absolute', inset: 0,
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
          }} />
          <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '0 48px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {stats.user.avatar_url ? (
                <img src={stats.user.avatar_url} alt="" style={{
                  width: 96, height: 96, borderRadius: 4, flexShrink: 0,
                  border: `3px solid ${rankColor}`,
                  boxShadow: `0 0 0 1px ${rankColor}30, 0 0 28px ${rankColor}40, 0 8px 24px rgba(0,0,0,0.7)`,
                  objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 96, height: 96, borderRadius: 4, flexShrink: 0,
                  background: 'var(--bg-card)',
                  border: `3px solid ${rankColor}`,
                  boxShadow: `0 0 0 1px ${rankColor}30, 0 0 28px ${rankColor}40, 0 8px 24px rgba(0,0,0,0.7)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: rankColor, fontSize: 32, fontWeight: 900,
                }}>
                  {stats.user.name[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {stats.user.name}
                  </h1>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#22c55e', boxShadow: '0 0 6px #22c55e80', flexShrink: 0,
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: `membro há ${stats.days_since_joined}d` },
                    { label: `${stats.current_streak}d streak`, bright: stats.current_streak > 0 },
                    { label: `${stats.total_completed} exercícios` },
                    { label: `${stats.days_active} dias ativos` },
                  ].map(({ label, bright }) => (
                    <span key={label} style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: bright ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${bright ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
                      color: bright ? 'var(--cyan)' : 'var(--muted)',
                      fontFamily: 'var(--f-mono)',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Streak badge */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, alignSelf: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316', fontFamily: 'var(--f-mono)', lineHeight: 1, textShadow: '0 0 14px #f9731660' }}>
                    {stats.current_streak}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="none">
                    <defs>
                      <linearGradient id="flameGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#fb923c" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#flameGrad)" d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
                  </svg>
                </div>
                <span style={{ fontSize: 9, color: '#f97316', opacity: 0.65, fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
                  streak
                </span>
              </div>

              <div style={{ flexShrink: 0 }}>
                <div style={{ position: 'relative', width: 96, height: 96 }}>
                  <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={48} cy={48} r={40} fill="none" stroke="var(--border)" strokeWidth="4" />
                    <circle cx={48} cy={48} r={40} fill="none"
                      stroke={rankColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * 0.5}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: rankColor, fontFamily: 'var(--f-mono)', lineHeight: 1, textShadow: `0 0 20px ${rankColor}80` }}>
                      {stats.rank.replace('kyu', '')}
                    </span>
                    <span style={{ fontSize: 10, color: rankColor, opacity: 0.7, fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}>kyu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Adjust mode */}
        {isAdjusting && (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '10px 16px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
              display: 'flex', alignItems: 'center', gap: 8,
              pointerEvents: 'none', zIndex: 3,
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--f-mono)', flex: 1 }}>
                arraste para reposicionar
              </span>
            </div>

            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(10,14,20,0.82)', borderRadius: 10, padding: '8px 16px',
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
              pointerEvents: 'none', zIndex: 3,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <input
                type="range" min="1" max="3" step="0.02"
                value={coverAdjust.scale}
                onChange={e => setCoverAdjust(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                style={{ width: 130, accentColor: 'var(--cyan)', pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseDown={e => e.stopPropagation()}
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
              </svg>
              <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'var(--f-mono)', minWidth: 32, textAlign: 'right' }}>
                {Math.round(coverAdjust.scale * 100)}%
              </span>
            </div>

            <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 6, zIndex: 3 }}>
              <button
                onClick={cancelAdjust}
                style={{ ...btnBase, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              >
                cancelar
              </button>
              <button
                onClick={saveAdjust}
                style={{ ...btnBase, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)', color: 'var(--cyan)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.15)' }}
              >
                salvar
              </button>
            </div>
          </>
        )}

        {/* Hover overlay */}
        {!isAdjusting && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: coverHovered ? 1 : 0,
            transition: 'opacity 180ms',
            backdropFilter: coverHovered ? 'blur(2px)' : 'none',
            pointerEvents: coverHovered ? 'auto' : 'none',
            zIndex: 1,
          }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverFile} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ ...btnBase, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? 'enviando...' : coverSrc ? 'trocar' : 'adicionar capa'}
            </button>
            {coverSrc && (
              <button
                onClick={() => { setCoverHovered(false); setIsAdjusting(true) }}
                style={{ ...btnBase, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                ajustar
              </button>
            )}
            {coverSrc && (
              <button
                onClick={handleRemoveCover}
                style={{ ...btnBase, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                </svg>
                remover
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom gradient — sits outside cover overflow:hidden, bleeds upward into image */}
      <div style={{
        position: 'relative', height: 28, marginTop: -28,
        background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 100%)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: '0 40px', alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            <BioSection initialBio={stats.user.bio} />

            <div>
              <SectionLabel label="Atividade — 365 dias" />
              <Heatmap heatmap={stats.heatmap} />
            </div>

            {stats.recent_completions.length > 0 && (
              <div>
                <SectionLabel label="Atividade recente" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.recent_completions.map((c, i) => {
                    const dc = DIFF_COLOR[c.difficulty] || '#525252'
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px',
                        background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                        borderRadius: 6, border: `1px solid ${i % 2 === 0 ? 'var(--border)' : 'transparent'}`,
                        transition: 'background 120ms',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                          background: `${dc}18`, border: `1px solid ${dc}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: dc, fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
                            {c.difficulty.replace('kyu', '')}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title}
                          </p>
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>{c.difficulty}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--f-mono)' }}>
                          {timeAgo(c.submitted_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, position: 'sticky', top: 24, alignSelf: 'start' }}>

            {/* Social links */}
            <SocialLinks initialLinks={stats.user.social_links} />

            {/* Badges */}
            <div>
              <SectionLabel label="Conquistas" />
              <BadgesGrid stats={stats} />
            </div>

            {/* Guild */}
            <div>
              <SectionLabel label="Guilda" />
              <div style={{
                borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-card)', overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(234,179,8,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--f-mono)', marginBottom: 2 }}>Sem guilda</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>nenhuma ainda</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
                  <button style={{
                    width: '100%', height: 30, borderRadius: 6, cursor: 'pointer',
                    fontSize: 10, fontWeight: 600, fontFamily: 'var(--f-mono)',
                    background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.22)',
                    color: 'rgba(234,179,8,0.8)',
                  }}>
                    criar ou entrar em uma guilda
                  </button>
                </div>
              </div>
            </div>

            {/* Friends */}
            <FriendsGrid />

          </div>
        </div>
      </div>
    </div>
  )
}

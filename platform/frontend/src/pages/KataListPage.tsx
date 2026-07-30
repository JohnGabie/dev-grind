import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding } from '../lib/layout'

interface Exercise {
  id: string; title: string; slug: string
  difficulty: string; module: string; tags: string[]
  created_at: string
  attempt_count: number; completion_count: number; user_status: string
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}
const DIFFS = ['8kyu', '7kyu', '6kyu', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu']
const DIFF_ORDER = Object.fromEntries(DIFFS.map((d, i) => [d, i]))

const RANK_THRESHOLDS: [number, string][] = [
  [0, '8kyu'], [30, '7kyu'], [120, '6kyu'],
  [400, '5kyu'], [1200, '4kyu'], [4000, '3kyu'],
]
function honorToRank(honor: number): string {
  let rank = '8kyu'
  for (const [threshold, name] of RANK_THRESHOLDS) {
    if (honor >= threshold) rank = name
  }
  return rank
}

type SortKey = 'newest' | 'oldest' | 'popular' | 'hardest' | 'easiest' | 'name' | 'relevance'
type ProgressKey = 'all' | 'not_attempted' | 'attempted' | 'completed'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',    label: 'mais recentes' },
  { value: 'oldest',    label: 'mais antigos' },
  { value: 'popular',   label: 'mais populares' },
  { value: 'hardest',   label: 'mais difíceis' },
  { value: 'easiest',   label: 'mais fáceis' },
  { value: 'name',      label: 'nome' },
  { value: 'relevance', label: 'relevância' },
]

const PROGRESS_OPTIONS: { value: ProgressKey; label: string }[] = [
  { value: 'all',           label: 'todos' },
  { value: 'not_attempted', label: 'não tentados' },
  { value: 'attempted',     label: 'não finalizados' },
  { value: 'completed',     label: 'completados' },
]

// Os dois Filter* aparecem dentro e fora do sheet e não recebem props de
// layout; consultar a media query direto evita furar a assinatura deles.
const isMobileVP = () => window.matchMedia(MOBILE_QUERY).matches

// ── FilterSelect (single-select dropdown) ───────────────────────────────────
function FilterSelect<T extends string>({
  label, value, options, onChange, hideLabel = false,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  hideLabel?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {!hideLabel && (
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 6px',
        }}>
          {label}
        </p>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: isMobileVP() ? 44 : 30, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg)', border: `1px solid ${open ? 'var(--border-lit)' : 'var(--border)'}`,
          borderRadius: 5, color: 'var(--text)', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--f-mono)',
          transition: 'border-color 120ms',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 2, background: 'var(--bg-card)', border: '1px solid var(--border-lit)',
          borderRadius: 5, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width: '100%', padding: '7px 10px', textAlign: 'left',
                background: opt.value === value ? 'rgba(34,211,238,0.06)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: opt.value === value ? 'var(--cyan)' : 'var(--text)',
                fontSize: 12, fontFamily: 'var(--f-mono)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 80ms',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ width: 9, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {opt.value === value && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FilterMultiSelect (multi-select dropdown with checkboxes) ────────────────
function FilterMultiSelect({
  label, values, options, onChange, placeholder, searchable,
}: {
  label: string
  values: Set<string>
  options: { value: string; label: string; color?: string }[]
  onChange: (next: Set<string>) => void
  placeholder?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (v: string) => {
    const next = new Set(values)
    next.has(v) ? next.delete(v) : next.add(v)
    onChange(next)
  }

  const displayLabel = values.size === 0
    ? (placeholder ?? 'todos')
    : values.size === 1
    ? options.find(o => values.has(o.value))?.label ?? `${values.size} sel.`
    : `${values.size} selecionados`

  const visible = searchable && q
    ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)', margin: 0,
        }}>
          {label}
        </p>
        {values.size > 0 && (
          <button onClick={e => { e.stopPropagation(); onChange(new Set()) }}
            style={{ fontSize: 9, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            limpar
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: isMobileVP() ? 44 : 30, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg)', border: `1px solid ${open ? 'var(--border-lit)' : 'var(--border)'}`,
          borderRadius: 5, color: values.size > 0 ? 'var(--text)' : 'var(--muted)', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--f-mono)',
          transition: 'border-color 120ms',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 2, background: 'var(--bg-card)', border: '1px solid var(--border-lit)',
          borderRadius: 5, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: 260, display: 'flex', flexDirection: 'column',
        }}>
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text" placeholder="buscar tag..."
                value={q} onChange={e => setQ(e.target.value)}
                autoFocus
                style={{
                  width: '100%', height: 24, padding: '0 8px', boxSizing: 'border-box',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 3, color: 'var(--text)', fontSize: 11,
                  fontFamily: 'var(--f-mono)', outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.map(opt => {
              const active = values.has(opt.value)
              const c = opt.color || 'var(--cyan)'
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{
                    width: '100%', padding: '6px 10px', textAlign: 'left',
                    background: active ? `${c}0f` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: active ? c : 'var(--text)',
                    fontSize: 12, fontFamily: 'var(--f-mono)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${active ? c : 'var(--border-lit)'}`,
                    background: active ? c : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms',
                  }}>
                    {active && (
                      <svg width="7" height="7" viewBox="0 0 12 12" fill="none"
                        stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </div>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── HexBadge ─────────────────────────────────────────────────────────────────
function HexBadge({ rank, size = 54 }: { rank: string; size?: number }) {
  const color = DIFF_COLOR[rank] || '#9b9b9b'
  const num = rank.replace('kyu', '')
  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 54 54">
        <polygon points="27,2 51,14 51,40 27,52 3,40 3,14"
          fill={`${color}14`} stroke={color} strokeWidth="1.5" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>{num}</span>
        <span style={{ fontSize: 8, fontWeight: 600, color, fontFamily: 'var(--f-mono)', opacity: 0.75, lineHeight: 1.4 }}>kyu</span>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'completed' ? 'var(--green)' : status === 'attempted' ? 'var(--yellow)' : 'var(--border-lit)'
  return (
    <div style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: color, marginTop: 2,
      boxShadow: status === 'completed' ? '0 0 6px rgba(63,185,80,0.5)' : 'none',
    }} />
  )
}

function KataCard({ ex, query, isMobile }: { ex: Exercise; query: string; isMobile: boolean }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const color = DIFF_COLOR[ex.difficulty] || '#9b9b9b'

  return (
    <button
      onClick={() => navigate(`/exercise/${ex.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 16,
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '14px 16px',
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        borderRadius: 6, marginBottom: 5,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <HexBadge rank={ex.difficulty} size={isMobile ? 44 : 54} />

      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <StatusDot status={ex.user_status} />
          <div style={{
            fontSize: 13, fontWeight: 700, color: hovered ? 'var(--cyan)' : 'var(--text)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color 120ms',
          }}>
            {ex.title}
          </div>
        </div>

        <div style={{
          fontSize: 10, color: 'var(--muted)', marginBottom: 7,
          fontFamily: 'var(--f-mono)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {ex.module}
          </span>
          {ex.attempt_count > 0 && (
            <span style={{ color: 'var(--faint)', opacity: 0.7 }}>
              {ex.attempt_count} tentativa{ex.attempt_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {ex.tags.map(t => {
            const isMatch = query && t.toLowerCase().includes(query.toLowerCase())
            return (
              <span key={t} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
                background: isMatch ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMatch ? 'rgba(34,211,238,0.25)' : 'var(--border)'}`,
                color: isMatch ? 'var(--cyan)' : 'var(--muted)',
              }}>
                {t}
              </span>
            )
          })}
        </div>
      </div>

      {/* A seta só muda de cor no hover, e no toque hover não existe. O card
          inteiro já é tocável, então no mobile ela é 13px + gap de decoração. */}
      {!isMobile && (
      <div style={{ paddingTop: 18, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? color : 'var(--border-lit)'}
          strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'stroke 120ms', display: 'block' }}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
      )}
    </button>
  )
}

function relevanceScore(ex: Exercise, q: string): number {
  if (!q) return 0
  const ql = q.toLowerCase()
  let score = 0
  if (ex.title.toLowerCase().startsWith(ql)) score += 10
  if (ex.title.toLowerCase().includes(ql)) score += 5
  if (ex.module.toLowerCase().includes(ql)) score += 3
  if (ex.tags.some(t => t.toLowerCase() === ql)) score += 4
  if (ex.tags.some(t => t.toLowerCase().includes(ql))) score += 2
  return score
}

export default function KataListPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [progress, setProgress] = useState<ProgressKey>('all')
  const [diffFilter, setDiffFilter] = useState<Set<string>>(new Set())
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [overflowLivre, setOverflowLivre] = useState(false)
  const modeApplied = useRef(false)

  useEffect(() => {
    api.get('/exercises').then(r => setExercises(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (!mode || modeApplied.current || exercises.length === 0) return
    modeApplied.current = true

    if (mode === 'warmup') {
      setDiffFilter(new Set(['8kyu', '7kyu']))
      setProgress('not_attempted')
    } else if (mode === 'practice') {
      setProgress('completed')
    } else if (mode === 'rankup') {
      const rank = honorToRank(user?.honor ?? 0)
      const rankIdx = DIFFS.indexOf(rank)
      if (rankIdx < DIFFS.length - 1) {
        setDiffFilter(new Set(DIFFS.slice(rankIdx + 1)))
      }
    }
  }, [exercises.length, user, searchParams])

  const allTags = useMemo(() =>
    Array.from(new Set(exercises.flatMap(ex => ex.tags))).sort(),
    [exercises]
  )

  const diffOptions = useMemo(() =>
    DIFFS.map(d => ({ value: d, label: d, color: DIFF_COLOR[d] })),
    []
  )

  const tagOptions = useMemo(() =>
    allTags.map(t => ({ value: t, label: t })),
    [allTags]
  )

  const hasFilters = diffFilter.size > 0 || tagFilter.size > 0 || progress !== 'all' || search

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = exercises.filter(ex => {
      if (diffFilter.size > 0 && !diffFilter.has(ex.difficulty)) return false
      if (tagFilter.size > 0 && !ex.tags.some(t => tagFilter.has(t))) return false
      if (progress === 'not_attempted' && ex.user_status !== 'not_attempted') return false
      if (progress === 'attempted' && ex.user_status !== 'attempted') return false
      if (progress === 'completed' && ex.user_status !== 'completed') return false
      if (q) {
        const matches = (
          ex.title.toLowerCase().includes(q) ||
          ex.tags.some(t => t.toLowerCase().includes(q)) ||
          ex.module.toLowerCase().includes(q)
        )
        if (!matches) return false
      }
      return true
    })

    switch (sort) {
      case 'newest':    list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)); break
      case 'oldest':    list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)); break
      case 'popular':   list = [...list].sort((a, b) => b.attempt_count - a.attempt_count); break
      case 'hardest':   list = [...list].sort((a, b) => (DIFF_ORDER[b.difficulty] ?? 99) - (DIFF_ORDER[a.difficulty] ?? 99)); break
      case 'easiest':   list = [...list].sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99)); break
      case 'name':      list = [...list].sort((a, b) => a.title.localeCompare(b.title)); break
      case 'relevance': list = [...list].sort((a, b) => relevanceScore(b, search) - relevanceScore(a, search)); break
    }
    return list
  }, [exercises, search, sort, progress, diffFilter, tagFilter])

  const resetAll = () => {
    setSearch(''); setSort('newest'); setProgress('all')
    setDiffFilter(new Set()); setTagFilter(new Set())
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--f-mono)' }}>_</span>
    </div>
  )

  const filterCount = diffFilter.size + tagFilter.size + (progress !== 'all' ? 1 : 0)

  // Travar o overflow antes de virar o estado cobre os dois sentidos: abrindo,
  // ele é liberado no transitionend; fechando, fica travado.
  const toggleFiltros = () => {
    setOverflowLivre(false)
    setFiltrosAbertos(v => !v)
  }

  const buscaBox = (
    <>
{/* Search */}
  <div style={{ position: 'relative' }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"
      style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text" placeholder="buscar por nome, tag..."
      value={search} onChange={e => setSearch(e.target.value)}
      style={{
        width: '100%', paddingLeft: isMobile ? 34 : 28, paddingRight: search ? 28 : 10,
        height: isMobile ? 44 : 30,
        fontSize: isMobile ? 16 : 12,
        boxSizing: 'border-box',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 5, color: 'var(--text)',
        fontFamily: 'var(--f-mono)', outline: 'none',
        transition: 'border-color 120ms',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--border-lit)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
    {search && (
      <button onClick={() => setSearch('')}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: 0,
        }}>×</button>
    )}
  </div>
    </>
  )
  const ordenar = (<>
{/* Sort By */}
  <FilterSelect
    label="ordenar"
    hideLabel={isMobile}
    value={sort}
    options={SORT_OPTIONS}
    onChange={v => setSort(v as SortKey)}
  />
  </>)
  const filtrosDoSheet = (<>
{/* Progress */}
  <FilterSelect
    label="progresso"
    value={progress}
    options={PROGRESS_OPTIONS}
    onChange={v => setProgress(v as ProgressKey)}
  />
{/* Difficulty */}
  <FilterMultiSelect
    label="dificuldade"
    values={diffFilter}
    options={diffOptions}
    onChange={setDiffFilter}
    placeholder="todas"
  />
{/* Tags */}
  {allTags.length > 0 && (
    <FilterMultiSelect
      label="tags"
      values={tagFilter}
      options={tagOptions}
      onChange={setTagFilter}
      placeholder="todas"
      searchable
    />
  )}
  </>)

  const cabecalho = (<>
{(() => {
  const mode = searchParams.get('mode')
  const labels: Record<string, { label: string; color: string }> = {
    rankup:   { label: 'Rank Up — desafios acima do seu nível', color: 'var(--cyan)' },
    warmup:   { label: 'Warm-up — fáceis, não tentados',        color: 'var(--green)' },
    practice: { label: 'Praticar — já completados',             color: '#a855f7' },
  }
  const m = mode ? labels[mode] : null
  return m ? (
    <div style={{
      marginBottom: 16, padding: '8px 14px', borderRadius: 5,
      background: m.color + '0f', border: `1px solid ${m.color}25`,
      fontSize: 11, color: m.color, fontFamily: 'var(--f-mono)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span>{m.label}</span>
      <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 11, padding: 0, opacity: 0.7 }}>
        limpar
      </button>
    </div>
  ) : null
})()}

<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
  <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
    kata library
  </h1>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {hasFilters && (
      <button onClick={resetAll}
        style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--f-mono)' }}>
        limpar filtros
      </button>
    )}
    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
      {filtered.length}{hasFilters ? ` / ${exercises.length}` : ''} katas
    </span>
  </div>
</div>

  </>)

  const lista = (<>
{filtered.length === 0 ? (
  <div style={{ padding: '40px 0', textAlign: 'center' }}>
    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
      {exercises.length === 0 ? 'nenhum kata disponível ainda.' : 'nenhum resultado.'}
    </p>
  </div>
) : (
  <div>
    {filtered.map(ex => <KataCard key={ex.id} ex={ex} query={search} isMobile={isMobile} />)}
  </div>
)}
  </>)

  // ── Desktop: coluna de filtros fixa ao lado da lista ───────────────────────
  if (!isMobile) return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      <div style={{
        width: 220, flexShrink: 0, height: '100%', overflowY: 'auto',
        borderRight: '1px solid var(--border)',
        padding: pagePadding('20px 16px 40px', isMobile, true),
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {buscaBox}
        {ordenar}
        {filtrosDoSheet}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: pagePadding('24px 26px 60px', isMobile, true) }}>
        {cabecalho}
        {lista}
      </div>
    </div>
  )

  // ── Mobile: uma coluna. A coluna de filtros custava 220px de 375 (59%) e
  //    sobravam 155px para o card, o que colapsava o título para 0px. Aqui ela
  //    vira um painel colapsável atrás de um botão de 44px, que empurra a lista
  //    em vez de cobri-la. Ordenar fica fora: troca-se a ordem muito mais vezes
  //    do que se restringe o conjunto, e enterrá-la custaria duas interações.
  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: pagePadding('24px 26px 60px', isMobile, true) }}>

        {cabecalho}

        <div style={{ marginBottom: 10 }}>{buscaBox}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={toggleFiltros}
            aria-expanded={filtrosAbertos}
            style={{
              flexShrink: 0, height: 44, padding: '0 14px',
              display: 'flex', alignItems: 'center', gap: 7,
              background: filtrosAbertos || filterCount ? 'var(--cyan-faint)' : 'var(--bg)',
              border: `1px solid ${filtrosAbertos || filterCount ? 'var(--cyan-glow)' : 'var(--border)'}`,
              borderRadius: 5, cursor: 'pointer',
              color: filtrosAbertos || filterCount ? 'var(--cyan)' : 'var(--text)',
              fontSize: 12, fontFamily: 'var(--f-mono)',
              transition: 'background 130ms, border-color 130ms, color 130ms',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            filtros
            {filterCount > 0 && (
              <span style={{
                minWidth: 17, height: 17, borderRadius: 9, padding: '0 5px',
                background: 'var(--cyan)', color: 'var(--bg)',
                fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {filterCount}
              </span>
            )}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{
                transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
                transform: filtrosAbertos ? 'rotate(180deg)' : 'none',
              }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>{ordenar}</div>
        </div>

        {/* Colapsável. grid-template-rows 0fr→1fr anima para a altura real do
            conteúdo, sem precisar de um max-height mágico. */}
        <div
          className="filtros-collapse"
          onTransitionEnd={() => setOverflowLivre(filtrosAbertos)}
          style={{
            display: 'grid',
            gridTemplateRows: filtrosAbertos ? '1fr' : '0fr',
            transition: 'grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* O overflow só é liberado no fim da abertura: os dropdowns de
              dificuldade e tags são absolute e ficariam cortados enquanto o
              painel cresce, ou apareceriam inteiros de saída se ficasse
              visible desde o começo. */}
          <div style={{ minHeight: 0, overflow: overflowLivre ? 'visible' : 'hidden' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              padding: '16px 0 4px',
            }}>
              {filtrosDoSheet}
              {filterCount > 0 && (
                <button
                  onClick={resetAll}
                  style={{
                    alignSelf: 'flex-start', minHeight: 44,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--f-mono)',
                    padding: 0,
                  }}
                >
                  limpar tudo
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>{lista}</div>
      </div>
    </div>
  )
}

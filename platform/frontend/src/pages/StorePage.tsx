import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { BackgroundPreview } from '../components/BackgroundRenderer'
import type { BgConfig } from '../components/StarfieldFooter'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding } from '../lib/layout'

interface StoreItem {
  id: string
  name: string
  description: string
  type: string
  category: string
  price_coins: number
  rarity: 'free' | 'common' | 'rare' | 'legendary'
  item_data: BgConfig & { max_purchases?: number }
  owned: boolean
  owned_count: number
  max_purchases: number
  equipped_slots: string[]
}

const CATEGORY_LABEL: Record<string, string> = {
  starfield:      'Starfield',
  matrix:         'Matrix',
  rain:           'Rain',
  aurora:         'Aurora',
  'midnight-sky': 'Midnight Sky',
  'radial-burst': 'Radial Burst',
  'neon-grid':    'Neon Grid',
}

function CoinIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="1.2" />
      <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fbbf24" fontFamily="monospace">G</text>
    </svg>
  )
}

type CategoryFilter = 'todos' | string

export default function StorePage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const navigate = useNavigate()
  const [items, setItems] = useState<StoreItem[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<CategoryFilter>('todos')
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const fetchAll = () => Promise.all([
    api.get('/store/items'),
    api.get('/users/me/stats'),
  ]).then(([itemsRes, statsRes]) => {
    setItems(itemsRes.data)
    setCoins(statsRes.data.coins ?? 0)
  }).catch(() => {})

  useEffect(() => { fetchAll().finally(() => setLoading(false)) }, [])

  const handleBuyUtility = async (item: StoreItem) => {
    if (buyingId) return
    setBuyingId(item.id)
    try {
      const r = await api.post(`/store/buy/${item.id}`)
      setCoins(r.data.coins)
      await fetchAll()
    } catch (e: any) {
      alert(e.response?.data?.detail ?? 'Erro ao comprar.')
    } finally {
      setBuyingId(null)
    }
  }

  const utilities = items.filter(i => i.type === 'book_slot')
  const backgrounds = items.filter(i => i.type === 'background')

  // Group by category
  const grouped: Record<string, StoreItem[]> = useMemo(() => {
    const g: Record<string, StoreItem[]> = {}
    for (const item of backgrounds) {
      if (!g[item.category]) g[item.category] = []
      g[item.category].push(item)
    }
    return g
  }, [backgrounds])

  // Available categories for the filter
  const categories = useMemo(() => Object.keys(grouped), [grouped])

  // Filtered entries
  const entries = useMemo(() => {
    const q = search.toLowerCase().trim()
    return Object.entries(grouped).filter(([cat, variants]) => {
      if (catFilter !== 'todos' && cat !== catFilter) return false
      if (q) {
        const label = (CATEGORY_LABEL[cat] ?? cat).toLowerCase()
        const matchesLabel = label.includes(q)
        const matchesVariant = variants.some(v => v.name.toLowerCase().includes(q))
        return matchesLabel || matchesVariant
      }
      return true
    })
  }, [grouped, catFilter, search])

  const totalOwned = backgrounds.filter(i => i.owned).length

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>_</span>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Sidebar esquerda ─────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, height: '100%', overflowY: 'auto',
        borderRight: '1px solid var(--border)',
        padding: pagePadding('20px 16px 40px', isMobile, true),
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* Título + GrindCoin */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--muted)',
            fontFamily: 'var(--f-mono)', margin: '0 0 10px',
          }}>
            Grind Store
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 12px', borderRadius: 8,
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.18)',
          }}>
            <CoinIcon size={15} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--f-mono)', color: '#fbbf24', lineHeight: 1 }}>
                {coins.toLocaleString()}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(251,191,36,0.45)', letterSpacing: '0.09em', fontFamily: 'var(--f-mono)', marginTop: 1 }}>
                GRIND COINS
              </div>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div style={{ position: 'relative' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 28, paddingRight: search ? 28 : 10,
              height: 30, fontSize: 12, boxSizing: 'border-box',
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

        {/* Categoria */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--muted)',
            fontFamily: 'var(--f-mono)', margin: '0 0 8px',
          }}>
            categoria
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(['todos', ...categories] as CategoryFilter[]).map(cat => {
              const isActive = catFilter === cat
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                    color: isActive ? 'var(--cyan)' : 'var(--muted)',
                    fontSize: 12, fontFamily: 'var(--f-mono)',
                    transition: 'background 120ms, color 120ms, border-left-color 120ms',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {cat === 'todos' ? 'todos' : (CATEGORY_LABEL[cat] ?? cat)}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Conteúdo principal ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: pagePadding('44px 44px 64px', isMobile, true) }}>

          {/* Heading */}
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em', fontFamily: 'var(--f-mono)' }}>
              // cosméticos
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.03em', color: 'var(--text)' }}>
              grind store
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
              {totalOwned}/{backgrounds.length} variantes adquiridas
            </p>
          </div>

          {/* ── Utilidades ───────────────────────────────────────────── */}
          {utilities.length > 0 && (
            <div style={{ marginBottom: 52 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--f-mono)', margin: '0 0 16px' }}>
                utilidades
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {utilities.map(item => {
                  const atMax = item.owned_count >= item.max_purchases
                  const canAfford = coins >= item.price_coins
                  const isbuying = buyingId === item.id
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 20,
                      padding: '18px 22px', borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                          <line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/>
                        </svg>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{item.description}</p>
                      </div>

                      {/* Count */}
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, fontFamily: 'var(--f-mono)', color: atMax ? 'var(--green)' : 'var(--text)' }}>
                          {item.owned_count}<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>/{item.max_purchases}</span>
                        </p>
                        <p style={{ margin: 0, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>compras</p>
                      </div>

                      {/* Buy button */}
                      <button
                        onClick={() => !atMax && canAfford && handleBuyUtility(item)}
                        disabled={atMax || !canAfford || isbuying}
                        style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 7, cursor: atMax || !canAfford ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700, fontFamily: 'var(--f-mono)',
                          border: '1px solid',
                          borderColor: atMax ? 'var(--border)' : canAfford ? 'rgba(168,85,247,0.4)' : 'var(--border)',
                          background: atMax ? 'transparent' : canAfford ? 'rgba(168,85,247,0.1)' : 'transparent',
                          color: atMax ? 'var(--green)' : canAfford ? '#a855f7' : 'var(--muted)',
                          opacity: isbuying ? 0.6 : 1,
                          transition: 'all 130ms',
                        }}
                      >
                        {atMax ? (
                          'máximo'
                        ) : (
                          <>
                            <CoinIcon size={11} />
                            {isbuying ? '...' : item.price_coins.toLocaleString()}
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grid */}
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                nenhum item encontrado
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 24,
            }}>
              {entries.map(([category, variants]) => {
                const first = variants[0]
                const ownedCount = variants.filter(v => v.owned).length
                const equipped = variants.some(v => v.equipped_slots.length > 0)
                const allFree = variants.every(v => v.price_coins === 0)

                return (
                  <div
                    key={category}
                    onClick={() => navigate(`/store/${first.id}`, { state: { items, coins } })}
                    style={{
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: `1px solid ${equipped ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                      background: 'var(--bg-card)',
                      boxShadow: equipped ? '0 0 16px rgba(34,211,238,0.08)' : 'none',
                      transition: 'transform 140ms, box-shadow 140ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = equipped ? '0 0 16px rgba(34,211,238,0.08)' : 'none'
                    }}
                  >
                    {/* Preview */}
                    <div style={{ position: 'relative', height: 130, background: 'var(--bg)' }}>
                      <BackgroundPreview config={first.item_data} />

                      {equipped && (
                        <div style={{
                          position: 'absolute', top: 8, left: 8,
                          width: 7, height: 7, borderRadius: '50%',
                          background: 'var(--cyan)', boxShadow: '0 0 7px var(--cyan)',
                        }} />
                      )}

                      {/* Color swatches */}
                      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4 }}>
                        {variants.slice(0, 6).map(v => {
                          const c1 = v.item_data.color1 ?? '#888'
                          const c2 = v.item_data.color2
                          const c3 = v.item_data.color3
                          const gradient = c2
                            ? `linear-gradient(135deg, ${c1}, ${c2}${c3 ? `, ${c3}` : ''})`
                            : c1
                          return (
                            <div key={v.id} style={{
                              width: 12, height: 12, borderRadius: 3,
                              background: gradient,
                              border: '1px solid rgba(255,255,255,0.2)',
                              boxShadow: v.owned ? `0 0 0 1.5px rgba(255,255,255,0.6)` : 'none',
                            }} />
                          )
                        })}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '12px 14px 14px' }}>
                      <p style={{
                        margin: '0 0 3px', fontSize: 14, fontWeight: 800,
                        letterSpacing: '-0.02em', color: 'var(--text)',
                      }}>
                        {CATEGORY_LABEL[category] ?? category}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                          {variants.length} variantes · {ownedCount} suas
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: 'var(--f-mono)',
                          color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          {allFree ? 'grátis' : <><CoinIcon size={9} />variado</>}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav, { MOBILE_NAV_SPACE } from './MobileNav'
import { useAuth } from '../../auth/AuthContext'
import { ChatPanel } from '../ChatPanel'
import { CosmeticsProvider } from '../../contexts/CosmeticsContext'
import { useMediaQuery, MOBILE_QUERY } from '../../hooks/useMediaQuery'
import api from '../../api/client'

// ── TopBar ───────────────────────────────────────────────────────────────────
const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<{ rank: string; honor: number; coins: number } | null>(null)

  useEffect(() => {
    api.get('/users/me/stats')
      .then(r => setStats({ rank: r.data.rank, honor: r.data.honor, coins: r.data.coins ?? 0 }))
      .catch(() => {})
  }, [])

  const rankColor = stats ? (DIFF_COLOR[stats.rank] || '#525252') : '#525252'

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 20,
    }}>
      {user && (
        <div style={{
          height: 54,
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderTop: 'none',
          borderRight: 'none',
          borderRadius: '0 0 0 14px',
          overflow: 'hidden',
        }}>

          {/* Honor */}
          {stats && (
            <button
              onClick={() => navigate('/profile')}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0 18px',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 130ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--f-mono)',
                letterSpacing: '-0.01em',
              }}>
                {stats.honor.toLocaleString()}
                <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 5 }}>honor</span>
              </span>
            </button>
          )}

          {/* Coins */}
          {stats && (
            <button
              onClick={() => navigate('/store')}
              title="Grind Store"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 130ms',
                borderLeft: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fbbf24" fontFamily="monospace">G</text>
              </svg>
              <span style={{
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--f-mono)',
                color: '#fbbf24', letterSpacing: '-0.01em',
              }}>
                {stats.coins.toLocaleString()}
              </span>
            </button>
          )}

          {/* Avatar */}
          <button
            onClick={() => navigate('/profile')}
            title={user.name}
            style={{
              width: 58,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 130ms',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${stats ? rankColor + '60' : 'var(--border-lit)'}`,
                objectFit: 'cover',
                boxShadow: stats ? `0 0 8px ${rankColor}30` : 'none',
              }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--cyan-faint)',
                border: '2px solid var(--cyan-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cyan)',
                fontSize: 13, fontWeight: 800,
                boxShadow: '0 0 8px rgba(34,211,238,0.18)',
              }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
          </button>

          {/* Rank — ocupa a ponta que era do Sair (que vive em Configurações) */}
          {stats && (
            <button
              onClick={() => navigate('/profile')}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderLeft: '1px solid var(--border)',
                transition: 'background 130ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                fontSize: 12, fontWeight: 800, fontFamily: 'var(--f-mono)',
                padding: '4px 11px', borderRadius: 6,
                background: `${rankColor}22`,
                border: `1.5px solid ${rankColor}60`,
                color: rankColor,
                letterSpacing: '0.06em',
                boxShadow: `0 0 10px ${rankColor}25`,
              }}>
                {stats.rank}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── ChatBubble ───────────────────────────────────────────────────────────────
function ChatBubble() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const slug = location.pathname.startsWith('/exercise/')
    ? location.pathname.split('/exercise/')[1]
    : null
  const context = slug ? `kata:${slug}` : location.pathname === '/' ? 'dashboard' : 'general'

  // No mobile a bolha sobe para não cobrir a tab bar.
  const bubbleBottom = isMobile ? `calc(24px + ${MOBILE_NAV_SPACE})` : 24
  const panelBottom = isMobile ? `calc(84px + ${MOBILE_NAV_SPACE})` : 84

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: panelBottom, right: 24, zIndex: 41,
          width: 'min(320px, calc(100vw - 48px))', height: 420,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-lit)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <ChatPanel context={context} style={{ height: '100%' }} />
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Chat"
        style={{
          position: 'fixed', bottom: bubbleBottom, right: 24, zIndex: 42,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? 'var(--cyan-faint)' : 'var(--bg-card)',
          border: `1px solid ${open ? 'var(--cyan)' : 'var(--cyan-glow)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--cyan)',
          boxShadow: open ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'background 150ms, border-color 150ms, box-shadow 150ms',
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const location = useLocation()
  const hideTopBar = location.pathname === '/profile'
  const isMobile = useMediaQuery(MOBILE_QUERY)

  return (
    <CosmeticsProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        {!isMobile && <Sidebar />}
        <main style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          paddingBottom: isMobile ? MOBILE_NAV_SPACE : 0,
        }}>
          {!hideTopBar && <TopBar />}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Outlet />
          </div>
        </main>
        {isMobile && <MobileNav />}
        <ChatBubble />
      </div>
    </CosmeticsProvider>
  )
}

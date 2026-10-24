import { useEffect, useState, type CSSProperties } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { useAuth } from '../../auth/AuthContext'
import { ChatPanel } from '../ChatPanel'
import { CosmeticsProvider } from '../../contexts/CosmeticsContext'
import { useMediaQuery, MOBILE_QUERY } from '../../hooks/useMediaQuery'
import { TOPBAR_SPACE, MOBILE_TOP_INSET, MOBILE_NAV_SPACE, LESSON_CHAT_TOP } from '../../lib/layout'
import { isInsideCourse, isInsideLesson, isOnSolvePage } from '../../lib/courseProgress'
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
  const location = useLocation()
  const [stats, setStats] = useState<{ rank: string; coins: number } | null>(null)

  useEffect(() => {
    api.get('/users/me/stats')
      .then(r => setStats({ rank: r.data.rank, coins: r.data.coins ?? 0 }))
      .catch(() => {})
  }, [])

  // Kyu e gcoin só no Dashboard — nas outras páginas a barra encolhe para o
  // avatar. A cor do rank continua tingindo o anel do avatar em toda página.
  const showStats = location.pathname === '/' && !!stats
  const rankColor = stats ? (DIFF_COLOR[stats.rank] || '#525252') : '#525252'

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 20,
    }}>
      {user && (
        <div style={{
          // Altura e padding em longhand: um shorthand `padding` aqui apagaria
          // o inset silenciosamente e só quebraria em iPhone com notch.
          height: TOPBAR_SPACE,
          paddingTop: 'env(safe-area-inset-top, 0px)',
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

          {/* Rank */}
          {showStats && (
            <button
              onClick={() => navigate('/profile')}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0 16px',
                background: 'none', border: 'none', cursor: 'pointer',
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

          {/* Coins */}
          {showStats && (
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
              // Sem stats o avatar é o único filho: a divisória dobraria com a
              // borda esquerda do próprio card.
              borderLeft: showStats ? '1px solid var(--border)' : 'none',
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
  const inCourse = isMobile && isInsideCourse(location.pathname)
  const inLesson = isMobile && isInsideLesson(location.pathname)
  const dockSpace = inCourse ? 'env(safe-area-inset-bottom, 0px)' : MOBILE_NAV_SPACE
  const [lessonDock, setLessonDock] = useState(false)
  useEffect(() => {
    const sync = () => setLessonDock(document.body.dataset.courseLesson === '1')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-course-lesson'] })
    return () => observer.disconnect()
  }, [])
  const onAbout = /^\/exercise\/[^/]+$/.test(location.pathname)

  const slug = location.pathname.startsWith('/exercise/')
    ? location.pathname.split('/exercise/')[1]
    : null

  // A tela de resolver tem as ações no rodapé e chat próprio na barra de cima;
  // a bolha caía em cima do botão "enviar".
  const naTelaDeResolver = location.pathname.endsWith('/solve')
  const context = slug ? `kata:${slug}` : location.pathname === '/' ? 'dashboard' : 'general'

  // No mobile a bolha sobe para não cobrir a tab bar.
  // Com um CTA fixo no rodape (licao, "sobre" do exercicio) a bolha sobe --ctl-primary + 16.
  const raised = lessonDock || (isMobile && onAbout)
  const bubbleBottom = raised
    ? (isMobile ? `calc(96px + ${dockSpace})` : 96)
    : (isMobile ? `calc(24px + ${dockSpace})` : 24)
  const panelBottom = raised
    ? (isMobile ? `calc(156px + ${dockSpace})` : 156)
    : (isMobile ? `calc(84px + ${dockSpace})` : 84)
  const rightOffset = isMobile ? 20 : 24

  const naDashboardMobile = isMobile && location.pathname === '/'
  if (naTelaDeResolver || naDashboardMobile) return null

  const squareTop = LESSON_CHAT_TOP
  const panelStyle: CSSProperties = inLesson
    ? {
        position: 'fixed', top: `calc(${squareTop} + var(--ctl-md) + 8px)`, right: rightOffset, zIndex: 41,
        width: 'min(320px, calc(100vw - 48px))', height: 420,
        maxHeight: `calc(100dvh - ${squareTop} - var(--ctl-md) - 8px - 16px)`,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-lit)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }
    : {
        position: 'fixed', bottom: panelBottom, right: rightOffset, zIndex: 41,
        width: 'min(320px, calc(100vw - 48px))', height: 420,
        maxHeight: isMobile ? `calc(100dvh - ${panelBottom} - 16px)` : undefined,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-lit)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }
  const buttonStyle: CSSProperties = inLesson
    ? {
        position: 'fixed', top: squareTop, right: rightOffset, zIndex: 42,
        width: 'var(--ctl-md)', height: 'var(--ctl-md)', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card)',
        border: `1px solid ${open ? 'var(--cyan)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--cyan)',
        transition: 'background 150ms, border-color 150ms',
      }
    : {
        position: 'fixed', bottom: bubbleBottom, right: rightOffset, zIndex: 42,
        width: 48, height: 48, borderRadius: '50%',
        background: open ? 'var(--cyan-faint)' : 'var(--bg-card)',
        border: `1px solid ${open ? 'var(--cyan)' : 'var(--cyan-glow)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--cyan)',
        boxShadow: open ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'background 150ms, border-color 150ms, box-shadow 150ms',
      }
  const iconSize = inLesson ? 16 : 18

  return (
    <>
      {open && (
        <div style={panelStyle}>
          <ChatPanel context={context} style={{ height: '100%' }} />
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Chat"
        style={buttonStyle}
      >
        {open ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}

// ── Layout ───────────────────────────────────────────────────────────────────
// Layout de altura fixa, com controles morando no rodapé: o editor de kata e o
// chat. Neles a moldura tem de parar acima da dock, senão ela cobre os botões.
// Todo o resto rola, vai até a borda de baixo — e reserva o espaço da dock no
// próprio conteúdo, via pagePadding — para o fundo passar atrás dela.
const FIXED_LAYOUT_PATHS = ['/chats']

export default function AppLayout() {
  const location = useLocation()
  const hideTopBar = location.pathname === '/profile'
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const inCourse = isMobile && isInsideCourse(location.pathname)
  // A tela de resolver é a única de /exercise com altura fixa; a página
  // "sobre" rola como qualquer outra.
  const isFixedLayout = FIXED_LAYOUT_PATHS.some(p => location.pathname.startsWith(p))
    || location.pathname.endsWith('/solve')
  const hideDock = inCourse || (isMobile && isOnSolvePage(location.pathname))

  return (
    <CosmeticsProvider>
      <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
        {!isMobile && <Sidebar />}
        <main style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          paddingBottom: isMobile && isFixedLayout ? (hideDock ? 'env(safe-area-inset-bottom, 0px)' : MOBILE_NAV_SPACE) : 0,
        }}>
          {!isMobile && !hideTopBar && <TopBar />}
          {/* Só os layouts de altura fixa cedem a faixa aqui — o header próprio
              deles precisa começar abaixo do notch. As páginas de rolagem vão
              até y=0 e reservam a faixa no conteúdo, via pagePadding, para o
              fundo passar atrás do notch em vez de parar antes dele.
              A faixa fica no wrapper e não no <main> porque o TopBar é absolute
              contra o padding box do main: um padding-top ali o empurraria. */}
          <div style={{
            height: '100%',
            overflow: 'hidden',
            paddingTop: isMobile && !hideTopBar && isFixedLayout ? MOBILE_TOP_INSET : 0,
          }}>
            <Outlet />
          </div>
        </main>
        {isMobile && !hideDock && <MobileNav />}
        <ChatBubble />
      </div>
    </CosmeticsProvider>
  )
}

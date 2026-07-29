import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MOBILE_TABS, MOBILE_SHEET } from './navItems'
import { useAuth } from '../../auth/AuthContext'
import { DOCK_HEIGHT, DOCK_GAP, DOCK_SIDE_INSET, MOBILE_NAV_SPACE } from '../../lib/layout'

const BAR_HEIGHT = DOCK_HEIGHT
const SIDE_INSET = DOCK_SIDE_INSET

// Onde a base da dock se apoia — a folha "Mais" empilha logo acima dela.
const DOCK_BOTTOM = `calc(${DOCK_GAP}px + env(safe-area-inset-bottom, 0px))`

const SHEET_PATHS = MOBILE_SHEET.map(i => i.to)

const SLOTS = MOBILE_TABS.length + 1        // as abas mais o "Mais"
const MORE_SLOT = MOBILE_TABS.length

export default function MobileNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => setSheetOpen(false), [location.pathname])

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const sheetActive = SHEET_PATHS.some(p => location.pathname.startsWith(p))

  // Slot onde a pílula descansa. Com a folha aberta ela vai para o "Mais" e
  // volta ao fechar — é a mesma animação servindo de feedback dos dois lados.
  const activeSlot = sheetOpen || sheetActive
    ? MORE_SLOT
    : MOBILE_TABS.findIndex(t => t.to === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(t.to))

  return (
    <>
      {sheetOpen && (
        <>
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 44,
              background: 'rgba(0,0,0,0.6)',
            }}
          />
          {/* Ancorada acima da dock: o "Mais" continua visível para fechar. */}
          <div style={{
            position: 'fixed', zIndex: 50,
            left: SIDE_INSET, right: SIDE_INSET,
            bottom: `calc(${MOBILE_NAV_SPACE} + 8px)`,
            background: 'rgba(17,17,17,0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid var(--border-lit)',
            borderRadius: 22,
            padding: 8,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            animation: 'sheet-up 180ms ease',
          }}>
            {MOBILE_SHEET.map(({ to, label, icon }) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => `sheet-item${isActive ? ' active' : ''}`}
              >
                <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
                {label}
              </NavLink>
            ))}

            <div style={{
              height: 1, background: 'var(--border)',
              margin: '6px 14px',
            }} />

            <button
              onClick={() => { logout(); navigate('/login') }}
              className="sheet-item danger"
            >
              <span style={{ display: 'flex', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              Sair
            </button>
          </div>
        </>
      )}

      <nav style={{
        position: 'fixed', zIndex: 45,
        left: SIDE_INSET, right: SIDE_INSET,
        bottom: DOCK_BOTTOM,
        height: BAR_HEIGHT,
        display: 'flex',
        padding: 6,
        background: 'rgba(17,17,17,0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid var(--border-lit)',
        borderRadius: BAR_HEIGHT / 2,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
      }}>
        {/* Uma pílula só, que desliza. Anima apenas transform/opacity. */}
        <span
          aria-hidden
          className="dock-pill"
          style={{
            width: `calc((100% - 12px) / ${SLOTS})`,
            transform: `translate3d(${Math.max(activeSlot, 0) * 100}%, 0, 0)`,
            opacity: activeSlot < 0 ? 0 : 1,
          }}
        />

        {MOBILE_TABS.map(({ to, label, icon }, i) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={`tab-item${activeSlot === i ? ' active' : ''}`}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setSheetOpen(o => !o)}
          className={`tab-item${activeSlot === MORE_SLOT ? ' active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span>Mais</span>
        </button>
      </nav>
    </>
  )
}

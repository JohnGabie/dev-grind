import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV, CONFIG_ITEM } from './navItems'

// Sidebar colapsada = 70px. Nav tem padding 0 8px → usável = 54px.
// Ícone = 20px. Centra em 54px: paddingLeft = (54-20)/2 = 17px.
// Expandida: paddingLeft = 14px (alinha com o conteúdo das páginas).
const ICON_PAD_COLLAPSED = 17
const ICON_PAD_EXPANDED  = 14

export default function Sidebar() {
  const [hovering, setHovering] = useState(false)
  return (
    <aside
      style={{ position: 'relative', width: 70, flexShrink: 0, height: '100vh' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: hovering ? 228 : 70,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        paddingTop: 18,
        paddingBottom: 18,
        paddingLeft: 8,
        paddingRight: 8,
        overflow: 'hidden',
        transition: 'width 220ms ease',
        zIndex: hovering ? 100 : 1,
      }}>

        {/* Logo strip */}
        <div style={{
          height: 38,
          borderRadius: 9,
          background: 'var(--cyan-faint)',
          border: '1px solid var(--cyan-glow)',
          display: 'flex', alignItems: 'center',
          gap: 10,
          // center the 17px logo icon in (54px usable) → paddingLeft = (54-17)/2 ≈ 18
          paddingLeft: hovering ? 12 : 18,
          marginBottom: 24,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'padding-left 220ms ease',
        }}>
          <svg width="17" height="17" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <path d="M16 3L29 10V22L16 29L3 22V10Z" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.1)" />
            <path d="M16 3V29M3 10L29 22M29 10L3 22" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
          </svg>
          <span style={{
            fontSize: 12, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.02em', whiteSpace: 'nowrap',
            maxWidth: hovering ? 140 : 0,
            opacity: hovering ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-width 220ms ease, opacity 150ms ease',
          }}>
            DevGrind
          </span>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          gap: 3,
        }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
              style={{
                width: '100%',
                height: 42,
                justifyContent: 'flex-start',
                paddingLeft: hovering ? ICON_PAD_EXPANDED : ICON_PAD_COLLAPSED,
                gap: 12,
                borderRadius: 7,
                transition: 'padding-left 220ms ease, color 130ms, background 130ms',
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
              <span style={{
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                maxWidth: hovering ? 140 : 0,
                opacity: hovering ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-width 220ms ease, opacity 150ms ease',
              }}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Config link */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <NavLink
            to={CONFIG_ITEM.to}
            className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
            style={{
              width: '100%', height: 42,
              justifyContent: 'flex-start',
              paddingLeft: hovering ? ICON_PAD_EXPANDED : ICON_PAD_COLLAPSED,
              gap: 12, borderRadius: 7,
              transition: 'padding-left 220ms ease, color 130ms, background 130ms',
            }}
          >
            <span style={{ flexShrink: 0, display: 'flex' }}>{CONFIG_ITEM.icon}</span>
            <span style={{
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              maxWidth: hovering ? 140 : 0,
              opacity: hovering ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-width 220ms ease, opacity 150ms ease',
            }}>
              {CONFIG_ITEM.label}
            </span>
          </NavLink>
        </div>

      </div>
    </aside>
  )
}

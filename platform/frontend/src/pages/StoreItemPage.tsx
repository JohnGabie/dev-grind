import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api from '../api/client'
import { BackgroundBg } from '../components/BackgroundRenderer'
import type { BgConfig } from '../components/StarfieldFooter'

interface StoreItem {
  id: string
  name: string
  description: string
  type: string
  category: string
  price_coins: number
  rarity: 'free' | 'common' | 'rare' | 'legendary'
  item_data: BgConfig
  owned: boolean
  equipped_slots: string[]
}

const RARITY_COLOR: Record<string, string> = {
  free:      '#525252',
  common:    '#3b82f6',
  rare:      '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABEL: Record<string, string> = {
  free:      'Grátis',
  common:    'Comum',
  rare:      'Raro',
  legendary: 'Lendário',
}

function CoinIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="1.2" />
      <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fbbf24" fontFamily="monospace">G</text>
    </svg>
  )
}

const MOCK_W = 1200
const MOCK_H = 750
const MOCK_SCALE = 760 / MOCK_W  // card maxWidth / design width ≈ 0.633

const NAV_ICONS = [
  <svg key="dash" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  <svg key="kata" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  <svg key="courses" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  <svg key="books" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  <svg key="chat" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  <svg key="store" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  <svg key="comm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
]

// Sidebar rail shared across all page mockups — matches real Sidebar.tsx
function MockSidebar({ activeIdx = 0 }: { activeIdx?: number }) {
  return (
    <div style={{
      width: 70, flexShrink: 0, height: MOCK_H,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 18, paddingBottom: 18,
      paddingLeft: 8, paddingRight: 8,
    }}>
      {/* Logo */}
      <div style={{
        height: 38, borderRadius: 9,
        background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, flexShrink: 0,
      }}>
        <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
          <path d="M16 3L29 10V22L16 29L3 22V10Z" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.1)" />
          <path d="M16 3V29M3 10L29 22M29 10L3 22" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
        </svg>
      </div>
      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV_ICONS.map((icon, i) => (
          <div key={i} style={{
            height: 42, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i === activeIdx && activeIdx >= 0 ? 'var(--cyan-faint)' : 'transparent',
            color: i === activeIdx && activeIdx >= 0 ? 'var(--cyan)' : 'var(--muted)',
          }}>
            {icon}
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard mockup — real UI at 1200×750 scaled to card size
function DashMockup() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        width: MOCK_W, height: MOCK_H,
        transform: `scale(${MOCK_SCALE})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
        fontFamily: 'var(--f-mono)',
        display: 'flex',
      }}>
        <MockSidebar activeIdx={0} />

        {/* Main area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* TopBar */}
          <div style={{
            position: 'absolute', top: 0, right: 0, zIndex: 10,
            height: 54, display: 'flex', alignItems: 'stretch',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            borderTop: 'none', borderRight: 'none',
            borderRadius: '0 0 0 14px', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px' }}>
              <span style={{
                fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 6,
                background: 'rgba(34,211,238,0.13)', border: '1.5px solid rgba(34,211,238,0.4)',
                color: 'var(--cyan)', letterSpacing: '0.06em',
              }}>6kyu</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>1,234<span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4 }}>honor</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderLeft: '1px solid var(--border)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fbbf24" fontFamily="monospace">G</text>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>850</span>
            </div>
            <div style={{ width: 58, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(34,211,238,0.25)', border: '2px solid rgba(34,211,238,0.5)' }} />
            </div>
            <div style={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 56px 0', overflow: 'hidden' }}>

            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                boa tarde, <span style={{ color: 'var(--cyan)' }}>João</span>
              </h1>
              <span style={{ fontSize: 11, color: '#3b82f6' }}>qui, 12 jun</span>
            </div>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              {[['🔥 3 dias', '#f97316'], ['14 exercícios', '#22d3ee'], ['1.234 honor', '#fbbf24'], ['6kyu', '#a855f7']].map(([label, color], i) => (
                <div key={i} style={{
                  padding: '5px 14px', borderRadius: 20,
                  background: `${color}14`, border: `1px solid ${color}30`,
                  color, fontSize: 12, fontWeight: 600,
                }}>{label as string}</div>
              ))}
            </div>

            {/* Trainer card */}
            <div style={{
              padding: '1.5px', borderRadius: 10, marginBottom: 28,
              background: 'linear-gradient(144deg, rgba(34,211,238,0.65), rgba(168,85,247,0.5))',
              boxShadow: 'rgba(34,211,238,0.08) 0 18px 32px -5px',
            }}>
              <div style={{ borderRadius: 9, background: 'var(--bg-card)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[['rankup', true], ['praticar', false], ['warmup', false]].map(([m, active], i) => (
                    <div key={i} style={{
                      padding: '4px 14px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      background: active ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(34,211,238,0.4)' : 'var(--border)'}`,
                      color: active ? 'var(--cyan)' : 'var(--muted)',
                    }}>{m as string}</div>
                  ))}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Decoradores em Python</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['python:functions', 'arch:patterns'].map((t, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 3,
                      background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--cyan)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* History */}
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>histórico</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { title: 'Funções async/await', diff: '6kyu', color: 'var(--cyan)' },
                { title: 'SQL Joins complexos', diff: '7kyu', color: '#3b82f6' },
                { title: 'FastAPI Auth JWT', diff: '5kyu', color: '#22c55e' },
                { title: 'Pydantic models', diff: '6kyu', color: 'var(--cyan)' },
              ].map((ex, i) => (
                <div key={i} style={{
                  width: 164, flexShrink: 0, padding: '12px 14px', borderRadius: 6,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: ex.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: ex.color }}>{ex.diff}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{ex.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Profile page mockup — real layout at 1200×750 scaled down
function ProfileMockup() {
  const rc = 'var(--cyan)'
  const circ = 2 * Math.PI * 33
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        width: MOCK_W, height: MOCK_H,
        transform: `scale(${MOCK_SCALE})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
        fontFamily: 'var(--f-mono)',
        display: 'flex',
      }}>
        <MockSidebar activeIdx={-1} />

        {/* Profile main — no TopBar on /profile */}
        <div style={{ flex: 1, overflowY: 'hidden', background: 'var(--bg)' }}>

          {/* Cover — background shows through (transparent), dark scrim at bottom */}
          <div style={{ height: 360, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
              background: 'linear-gradient(to bottom, transparent, rgba(8,10,14,0.92))',
            }} />

            {/* Profile header at bottom of cover */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 20px' }}>
              <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 24 }}>
                {/* Avatar */}
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(34,211,238,0.28)',
                  border: '3px solid rgba(8,10,14,0.85)',
                  boxShadow: '0 0 0 2px rgba(34,211,238,0.45)',
                }} />
                {/* Name + badges */}
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>João Gabriel</h1>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e80' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['membro há 42d', '3d streak', '14 exercícios', '28 dias ativos'].map((label, i) => (
                      <span key={i} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: i === 1 ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${i === 1 ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: i === 1 ? 'var(--cyan)' : 'var(--muted)',
                      }}>{label}</span>
                    ))}
                  </div>
                </div>
                {/* Streak */}
                <div style={{ flexShrink: 0, textAlign: 'center', paddingBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#f97316', lineHeight: 1, textShadow: '0 0 14px #f9731660' }}>3</span>
                  <div style={{ fontSize: 9, color: '#f97316', opacity: 0.7, marginTop: 2 }}>streak</div>
                </div>
                {/* Rank ring */}
                <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                  <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={44} cy={44} r={33} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5"/>
                    <circle cx={44} cy={44} r={33} fill="none" stroke={rc} strokeWidth="4.5" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={circ * 0.6}/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: rc, lineHeight: 1 }}>6</span>
                    <span style={{ fontSize: 9, color: rc, opacity: 0.7 }}>kyu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content below cover */}
          <div style={{ background: 'var(--bg)', padding: '28px 40px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Showcase row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: 16 }}>
                <div style={{
                  height: 140, borderRadius: 8, border: '1px solid rgba(249,115,22,0.25)',
                  background: 'linear-gradient(160deg, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.04) 60%, var(--bg-card) 100%)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ padding: '12px 14px 0', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Sequência</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 48, fontWeight: 900, color: '#f97316', fontFamily: 'var(--f-mono)', letterSpacing: '-0.04em', textShadow: '0 0 24px #f9731640' }}>3</span>
                  </div>
                  <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(249,115,22,0.15)', fontSize: 9, color: 'var(--muted)', textAlign: 'right' }}>28 dias ativos no total</div>
                </div>
                <div style={{
                  height: 140, borderRadius: 8, border: '1px solid rgba(34,211,238,0.2)',
                  background: 'linear-gradient(160deg, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 60%, var(--bg-card) 100%)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ padding: '12px 14px 0', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Nível</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: 64, height: 64 }}>
                      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={32} cy={32} r={24} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
                        <circle cx={32} cy={32} r={24} fill="none" stroke={rc} strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={2*Math.PI*24} strokeDashoffset={2*Math.PI*24*0.6}/>
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: rc, lineHeight: 1 }}>6</span>
                        <span style={{ fontSize: 8, color: rc, opacity: 0.7 }}>kyu</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: rc, letterSpacing: '-0.03em', lineHeight: 1 }}>1.234</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>honor</div>
                    </div>
                  </div>
                </div>
                <div style={{
                  height: 140, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px 8px', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Completado recentemente</div>
                  {[{ t: 'Funções async/await', d: '6kyu', c: 'var(--cyan)' }, { t: 'SQL Joins complexos', d: '7kyu', c: '#3b82f6' }].map((item, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{item.t}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: item.c }}>{item.d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Atividade — último ano</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[...Array(45)].map((_, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[...Array(7)].map((__, di) => {
                        const n = (wi * 7 + di)
                        const bg = n % 13 === 0 ? 'rgba(34,211,238,0.92)' : n % 9 === 0 ? 'rgba(34,211,238,0.55)' : n % 5 === 0 ? 'rgba(34,211,238,0.28)' : 'rgba(255,255,255,0.05)'
                        return <div key={di} style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Public profile — FriendCard hover popup, real proportions scaled down
function PublicProfileMockup() {
  const circ = 2 * Math.PI * 20
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        width: MOCK_W, height: MOCK_H,
        transform: `scale(${MOCK_SCALE})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
        fontFamily: 'var(--f-mono)',
        display: 'flex',
      }}>
        <MockSidebar activeIdx={-1} />

        {/* Simulated profile page in the background */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
          {/* Blurred background hint */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
          }} />

          {/* The FriendCard popup — exactly as in ProfilePage */}
          <div style={{
            position: 'absolute',
            left: 240, top: 120,
            width: 240,
            background: 'rgb(13,17,24)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          }}>
            {/* Banner — background shows through */}
            <div style={{ height: 72, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.38) 0%, rgba(34,211,238,0.16) 50%, transparent 100%)',
              }} />
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
                  background: 'rgba(34,211,238,0.2)',
                  border: '3px solid rgb(13,17,24)',
                  outline: '2px solid rgba(34,211,238,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: 'rgba(34,211,238,0.85)',
                }}>J</div>
                <div style={{
                  position: 'absolute', bottom: 1, right: -1,
                  width: 13, height: 13, borderRadius: '50%',
                  background: '#22c55e', border: '3px solid rgb(13,17,24)',
                  boxShadow: '0 0 8px #22c55e80',
                }} />
              </div>

              {/* Rank badge top-right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 5,
                  background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.38)',
                  color: 'rgba(34,211,238,0.9)',
                }}>6kyu</span>
              </div>

              {/* Name + status */}
              <div style={{ paddingTop: 10, paddingBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>João Gabriel</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e80' }} />
                  <span style={{ fontSize: 10, color: '#22c55e' }}>online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Friends grid context behind the popup */}
          <div style={{ position: 'absolute', left: 100, top: 100, display: 'flex', gap: 8, opacity: 0.4 }}>
            {['B', 'V', 'R'].map((initial, i) => (
              <div key={i} style={{
                width: 40, height: 40, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.4)',
              }}>{initial}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StoreItemPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [allItems, setAllItems] = useState<StoreItem[]>([])
  const [item, setItem] = useState<StoreItem | null>(null)
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState(0)
  const touchX = useRef<number | null>(null)

  // Initial load — use pre-fetched state from StorePage if available
  useEffect(() => {
    const state = location.state as { items?: StoreItem[]; coins?: number } | null
    if (state?.items) {
      setAllItems(state.items)
      setCoins(state.coins ?? 0)
      setLoading(false)
    } else {
      Promise.all([
        api.get('/store/items'),
        api.get('/users/me/stats'),
      ]).then(([itemsRes, statsRes]) => {
        setAllItems(itemsRes.data)
        setCoins(statsRes.data.coins ?? 0)
      }).finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected item whenever itemId or list changes
  useEffect(() => {
    if (allItems.length > 0) {
      setItem(allItems.find(i => i.id === itemId) ?? null)
    }
  }, [itemId, allItems])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>_</span>
    </div>
  )

  if (!item) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>item não encontrado</span>
      <button onClick={() => navigate('/store')} style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
        ← voltar
      </button>
    </div>
  )

  const rc = RARITY_COLOR[item.rarity]
  const variants = allItems.filter(i => i.category === item.category && i.type === item.type)

  const slides = [
    { key: 'pure',    label: 'fundo puro',    overlay: null },
    { key: 'dash',    label: 'dashboard',     overlay: <DashMockup /> },
    { key: 'profile', label: 'perfil',        overlay: <ProfileMockup /> },
    { key: 'friend',  label: 'perfil público', overlay: <PublicProfileMockup /> },
  ]
  const prev = () => setSlide(s => (s - 1 + slides.length) % slides.length)
  const next = () => setSlide(s => (s + 1) % slides.length)
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx > 40) prev()
    else if (dx < -40) next()
    touchX.current = null
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header — idêntico ao StorePage */}
      <div style={{
        flexShrink: 0, padding: '18px 28px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Grind <span style={{ color: 'var(--cyan)' }}>Store</span>
        </h1>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
          {item.name}
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* CENTER — carousel */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', padding: '16px 20px 20px', gap: 12,
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Back button — inside the grid */}
          <button
            onClick={() => navigate('/store')}
            style={{
              position: 'absolute', top: 16, left: 16,
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7, padding: '5px 10px',
              cursor: 'pointer', color: 'var(--muted)',
              fontSize: 11, fontFamily: 'var(--f-mono)',
              transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            voltar
          </button>

          {/* Slide area */}
          <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Prev arrow */}
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: 0, zIndex: 10,
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Card */}
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              style={{
                width: '92%', maxWidth: 760,
                aspectRatio: '16 / 10',
                borderRadius: 14, overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)`,
              }}
            >
              <BackgroundBg config={item.item_data} />
              {slides[slide].overlay}
            </div>

            {/* Next arrow */}
            <button
              onClick={next}
              style={{
                position: 'absolute', right: 0, zIndex: 10,
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Label + dots */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
              {slides[slide].label}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    width: i === slide ? 20 : 6, height: 6,
                    borderRadius: 3, border: 'none', cursor: 'pointer',
                    background: i === slide ? rc : 'rgba(255,255,255,0.2)',
                    padding: 0,
                    transition: 'width 200ms, background 200ms',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LEFT — details */}
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 22px' }}>

            {/* Rarity */}
            <span style={{
              display: 'inline-block', marginBottom: 14,
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--f-mono)',
              letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: 4,
              background: rc + '18', border: `1px solid ${rc}50`, color: rc,
            }}>
              {RARITY_LABEL[item.rarity]}
            </span>

            <h1 style={{ margin: '0 0 10px', fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {item.name}
            </h1>

            <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>
              {item.description}
            </p>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 22 }} />

            {/* Variants / color swatches */}
            {variants.length > 1 && (
              <>
                <p style={{
                  margin: '0 0 12px',
                  fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--muted)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Variantes — {variants.length}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {variants.map(v => {
                    const c1 = v.item_data.color1 ?? '#888'
                    const c2 = v.item_data.color2
                    const c3 = v.item_data.color3
                    const isSelected = v.id === item.id
                    const gradient = c2
                      ? `linear-gradient(135deg, ${c1}, ${c2}${c3 ? `, ${c3}` : ''})`
                      : c1
                    return (
                      <button
                        key={v.id}
                        onClick={() => navigate(`/store/${v.id}`, { state: { items: allItems, coins } })}
                        title={v.name}
                        style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: gradient,
                          border: isSelected
                            ? '2.5px solid var(--text)'
                            : '2px solid rgba(255,255,255,0.12)',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none',
                          transition: 'border 120ms, box-shadow 120ms',
                          padding: 0,
                        }}
                      />
                    )
                  })}
                </div>
              </>
            )}

            {/* Price */}
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>preço</span>
              <span style={{
                fontSize: 13, fontWeight: 800, fontFamily: 'var(--f-mono)',
                color: item.owned ? rc : 'var(--text)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {item.owned
                  ? 'adquirido'
                  : item.price_coins === 0
                    ? 'grátis'
                    : <><CoinIcon size={12} />{item.price_coins.toLocaleString()}</>
                }
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

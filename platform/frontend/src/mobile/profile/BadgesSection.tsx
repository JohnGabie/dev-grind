import { useState } from 'react'
import { BADGES, isUnlocked, type BadgeStats } from '../badges'
import Readout from '../Readout'
import Section from '../Section'

export default function BadgesSection({ stats }: { stats: BadgeStats }) {
  const [selected, setSelected] = useState<string | null>(null)
  const chosen = BADGES.find(b => b.id === selected) ?? null
  const earned = BADGES.filter(b => isUnlocked(b, stats)).length

  return (
    <Section label={`conquistas · ${earned}/${BADGES.length}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {BADGES.map(def => {
          const on = isUnlocked(def, stats)
          return (
            <button
              key={def.id}
              type="button"
              aria-label={def.label}
              aria-pressed={selected === def.id}
              onClick={() => setSelected(def.id)}
              style={{
                width: 'var(--ctl-chip)', height: 'var(--ctl-md)', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{
                width: 'var(--ctl-chip)', height: 'var(--ctl-chip)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${on ? def.color : 'var(--border)'}`,
                outline: selected === def.id ? '1px solid var(--text)' : 'none',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on ? def.color : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {on
                    ? <path d={def.svg} />
                    : (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>)}
                </svg>
              </span>
            </button>
          )
        })}
      </div>
      <Readout>
        {chosen ? (isUnlocked(chosen, stats) ? `${chosen.label} · ${chosen.hint}` : `${chosen.label} · bloqueado`) : 'toque em uma conquista'}
      </Readout>
    </Section>
  )
}

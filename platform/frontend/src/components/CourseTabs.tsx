import { useRef, type KeyboardEvent } from 'react'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import type { CourseTab } from '../lib/courseTab'

interface Props {
  tab: CourseTab
  onTab: (tab: CourseTab) => void
}

const TABS: { key: CourseTab; label: string }[] = [
  { key: 'cursos', label: 'Cursos' },
  { key: 'roadmaps', label: 'Roadmaps' },
]

export default function CourseTabs({ tab, onTab }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const refs = useRef<Record<CourseTab, HTMLButtonElement | null>>({ cursos: null, roadmaps: null })

  const move = (event: KeyboardEvent, index: number) => {
    const last = TABS.length - 1
    const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index + last) % TABS.length
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : -1
    if (next < 0) return
    event.preventDefault()
    onTab(TABS[next].key)
    refs.current[TABS[next].key]?.focus()
  }

  return (
    <div role="tablist" aria-label="cursos e roadmaps" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
      {TABS.map((item, index) => {
        const on = item.key === tab
        return (
          <button
            key={item.key}
            ref={element => { refs.current[item.key] = element }}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-controls={`panel-${item.key}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onTab(item.key)}
            onKeyDown={event => move(event, index)}
            style={{
              boxSizing: 'border-box',
              minHeight: isMobile ? 'var(--ctl-md)' : 36,
              padding: '0 16px',
              marginBottom: -1,
              background: 'none',
              border: 'none',
              borderBottom: on ? '2px solid var(--cyan)' : '2px solid transparent',
              color: on ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: isMobile ? 'var(--fs-base)' : 14,
              fontWeight: on ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

import type { ReactNode } from 'react'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { SORTS, VIEWS, type SortKey, type ViewKey } from '../lib/courseView'

interface Props {
  query: string
  onQuery: (query: string) => void
  sort: SortKey
  onSort: (sort: SortKey) => void
  view: ViewKey
  onView: (view: ViewKey) => void
  placeholder: string
}

const ICONS: Record<ViewKey, ReactNode> = {
  cards: (
    <>
      <rect x="3" y="3" width="14" height="6" rx="2" />
      <rect x="3" y="11" width="14" height="6" rx="2" />
    </>
  ),
  lista: (
    <>
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </>
  ),
  grade: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </>
  ),
  galeria: (
    <>
      <rect x="3" y="2" width="14" height="10" rx="2" />
      <rect x="3" y="14" width="6" height="4" rx="1.5" />
    </>
  ),
}

export default function CourseToolbar({ query, onQuery, sort, onSort, view, onView, placeholder }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const height = isMobile ? 'var(--ctl-md)' : 36
  const fontSize = isMobile ? 'var(--fs-input)' : 13
  const field = {
    boxSizing: 'border-box' as const,
    height,
    fontFamily: 'inherit',
    fontSize,
    color: 'var(--text)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    minWidth: 0,
  }

  return (
    <div style={{ width: '100%', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="search"
          aria-label="buscar cursos"
          placeholder={placeholder}
          value={query}
          onChange={event => onQuery(event.target.value)}
          style={{ ...field, width: '100%', padding: query ? '0 64px 0 12px' : '0 12px' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            style={{
              position: 'absolute', top: 0, right: 0, height, padding: '0 12px',
              background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: isMobile ? 'var(--fs-sm)' : 12,
            }}
          >
            limpar
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          aria-label="ordenar"
          value={sort}
          onChange={event => onSort(event.target.value as SortKey)}
          style={{ ...field, flex: 1, padding: '0 8px' }}
        >
          {SORTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <div role="group" aria-label="visualização" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {VIEWS.map(key => {
            const on = key === view
            return (
              <button
                key={key}
                type="button"
                aria-label={key}
                title={key}
                aria-pressed={on}
                onClick={() => onView(key)}
                style={{
                  boxSizing: 'border-box', width: height, height, padding: 0, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: on ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  color: on ? 'var(--cyan)' : 'var(--muted)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  {ICONS[key]}
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

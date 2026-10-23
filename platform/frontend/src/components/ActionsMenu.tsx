import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

export interface ActionsMenuItem {
  key: string
  label: string
  disabled?: boolean
  hint?: string
  onSelect: () => void
}

interface Props {
  items: ActionsMenuItem[]
}

export default function ActionsMenu({ items }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items })

  const activeItems = () => items.filter(item => !item.disabled)

  const focusItem = (index: number) => {
    const active = activeItems()
    if (active.length === 0) return
    itemRefs.current[active[(index + active.length) % active.length].key]?.focus()
  }

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const first = itemsRef.current.find(item => !item.disabled)
    if (first) itemRefs.current[first.key]?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const active = activeItems()
    const current = active.findIndex(item => itemRefs.current[item.key] === document.activeElement)
    const next = event.key === 'ArrowDown' ? current + 1
      : event.key === 'ArrowUp' ? current - 1
        : event.key === 'Home' ? 0
          : event.key === 'End' ? active.length - 1
            : null
    if (event.key === 'Tab') { setOpen(false); return }
    if (next === null) return
    event.preventDefault()
    focusItem(next)
  }

  const select = (item: ActionsMenuItem) => {
    if (item.disabled) return
    close()
    item.onSelect()
  }

  const size = 'var(--ctl-md)'

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: isMobile ? 'var(--ctl-md)' : 36, marginBottom: -1 }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="ações"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(value => !value)}
        style={{
          boxSizing: 'border-box',
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          background: open ? 'var(--bg-card)' : 'none',
          border: '1px solid transparent',
          borderRadius: 'var(--radius-lg)',
          color: open ? 'var(--text)' : 'var(--muted)',
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="ações"
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 20,
            boxSizing: 'border-box',
            width: 'max-content',
            minWidth: 200,
            maxWidth: 'calc(100vw - var(--sp-7))',
            padding: 'var(--sp-1)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {items.map(item => (
            <button
              key={item.key}
              ref={element => { itemRefs.current[item.key] = element }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled ? 'true' : undefined}
              onClick={() => select(item)}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                minHeight: 'var(--ctl-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--sp-4)',
                padding: '0 var(--sp-3)',
                background: 'none',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: item.disabled ? 'var(--muted)' : 'var(--text)',
                fontFamily: 'inherit',
                fontSize: 'var(--fs-base)',
                textAlign: 'left',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.6 : 1,
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.hint && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

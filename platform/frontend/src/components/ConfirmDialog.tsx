import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  title: string
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  checkbox?: { label: string; checked: boolean; onChange: (checked: boolean) => void }
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled])'

export default function ConfirmDialog({ title, body, confirmLabel = 'apagar', cancelLabel = 'cancelar', checkbox, busy = false, error, onConfirm, onCancel }: Props) {
  const titleId = useId()
  const errorId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => { opener?.focus() }
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!busy) onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!dialogRef.current?.contains(active)) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const button = {
    boxSizing: 'border-box' as const,
    minHeight: 'var(--ctl-md)',
    padding: '0 var(--sp-4, 16px)',
    fontFamily: 'inherit',
    fontSize: 'var(--fs-base)',
    background: 'transparent',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
  }

  return (
    <div
      onClick={event => { if (event.target === event.currentTarget && !busy) onCancel() }}
      onKeyDown={onKeyDown}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        style={{ boxSizing: 'border-box', width: '100%', maxWidth: 420, maxHeight: '100%', overflowY: 'auto', padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text)' }}
      >
        <h2 id={titleId} style={{ margin: '0 0 var(--sp-2, 8px)', fontSize: 'var(--fs-lg)', overflowWrap: 'anywhere' }}>{title}</h2>
        <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-base)', marginBottom: 12 }}>{body}</div>
        {checkbox && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 'var(--ctl-md)', fontSize: 'var(--fs-base)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checkbox.checked}
              disabled={busy}
              onChange={event => checkbox.onChange(event.target.checked)}
              style={{ width: 20, height: 20, margin: 0, flexShrink: 0, accentColor: 'var(--red)' }}
            />
            <span>{checkbox.label}</span>
          </label>
        )}
        {error && (
          <p id={errorId} role="alert" style={{ color: 'var(--red)', fontSize: 'var(--fs-base)', margin: '8px 0 0' }}>
            Erro: {error}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} style={{ ...button, color: 'var(--text)', border: '1px solid var(--border)', opacity: busy ? 0.5 : 1 }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} style={{ ...button, color: 'var(--red)', border: '1px solid var(--red)', opacity: busy ? 0.5 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

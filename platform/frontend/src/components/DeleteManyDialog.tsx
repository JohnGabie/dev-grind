import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { deleteCoursesNotice } from '../lib/roadmapDelete'
import type { BulkDeleteResult } from '../lib/bulkDelete'

export interface DeleteManyItem {
  id: string
  title: string
  detail: string
}

interface Props {
  title: string
  unit: { one: string; many: string }
  items: DeleteManyItem[]
  alsoCourses?: { label: string; countFor: (ids: string[]) => number }
  onDelete: (ids: string[], alsoCourses: boolean) => Promise<BulkDeleteResult>
  onClose: (deletedAny: boolean) => void
}

export default function DeleteManyDialog({ title, unit, items, alsoCourses, onDelete, onClose }: Props) {
  const [step, setStep] = useState<'list' | 'confirm'>('list')
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [withCourses, setWithCourses] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = items.filter(item => !gone.has(item.id))
  const selected = remaining.filter(item => ticked.has(item.id))
  const allTicked = remaining.length > 0 && selected.length === remaining.length
  const count = (n: number) => `${n} ${n === 1 ? unit.one : unit.many}`

  const toggle = (id: string, on: boolean) => setTicked(current => {
    const next = new Set(current)
    if (on) next.add(id)
    else next.delete(id)
    return next
  })

  const confirm = async () => {
    setBusy(true)
    setError(null)
    const result = await onDelete(selected.map(item => item.id), alsoCourses ? withCourses : false)
    setBusy(false)
    const nextGone = new Set([...gone, ...result.deleted])
    setGone(nextGone)
    if (result.failed.length === 0) {
      onClose(nextGone.size > 0)
      return
    }
    const titles = items.filter(item => result.failed.includes(item.id)).map(item => item.title)
    setTicked(new Set(result.failed))
    setStep('list')
    setError(`Não foi possível apagar: ${titles.join(', ')}`)
  }

  const row = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 'var(--ctl-md)', cursor: busy ? 'default' : 'pointer', color: 'var(--text)' }
  const box = { width: 20, height: 20, margin: 0, flexShrink: 0, accentColor: 'var(--red)' }

  if (step === 'confirm') {
    const notice = alsoCourses && withCourses ? deleteCoursesNotice(alsoCourses.countFor(selected.map(item => item.id))) : ''
    return (
      <ConfirmDialog
        title={`Apagar ${count(selected.length)}?`}
        body={
          <>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)', overflowWrap: 'anywhere' }}>
              {selected.map(item => <li key={item.id}>{item.title}</li>)}
            </ul>
            <p style={{ margin: '8px 0 0' }}>O progresso será perdido. Não dá para desfazer.</p>
            {notice && <p style={{ margin: '8px 0 0', color: 'var(--red)' }}>{notice}</p>}
          </>
        }
        checkbox={alsoCourses ? { label: alsoCourses.label, checked: withCourses, onChange: setWithCourses } : undefined}
        cancelLabel="voltar"
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={() => setStep('list')}
      />
    )
  }

  return (
    <ConfirmDialog
      title={title}
      body={
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <label style={row}>
              <input
                type="checkbox"
                checked={allTicked}
                disabled={busy || remaining.length === 0}
                onChange={event => setTicked(event.target.checked ? new Set(remaining.map(item => item.id)) : new Set())}
                style={box}
              />
              <span>selecionar todos</span>
            </label>
            <span role="status" style={{ whiteSpace: 'nowrap' }}>{selected.length} selecionados</span>
          </div>
          {remaining.map(item => (
            <label key={item.id} style={row}>
              <input
                type="checkbox"
                checked={ticked.has(item.id)}
                disabled={busy}
                onChange={event => toggle(item.id, event.target.checked)}
                style={box}
              />
              <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{item.title}</span>
              <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)', whiteSpace: 'nowrap' }}>{item.detail}</span>
            </label>
          ))}
        </>
      }
      confirmDisabled={selected.length === 0}
      busy={busy}
      error={error}
      onConfirm={() => { setError(null); setStep('confirm') }}
      onCancel={() => onClose(gone.size > 0)}
    />
  )
}

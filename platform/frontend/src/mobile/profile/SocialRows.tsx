import { useState } from 'react'
import api from '../../api/client'
import ListRow from '../ListRow'
import Section from '../Section'

const NETWORKS: { id: string; label: string }[] = [
  { id: 'github', label: 'GitHub' }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'twitter', label: 'X' },
  { id: 'instagram', label: 'Instagram' }, { id: 'discord', label: 'Discord' },
  { id: 'youtube', label: 'YouTube' }, { id: 'steam', label: 'Steam' },
]

export default function SocialRows({ initialLinks }: { initialLinks: Record<string, string> }) {
  const [links, setLinks] = useState(initialLinks)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState(false)

  const filled = NETWORKS.filter(n => links[n.id])
  const free = NETWORKS.filter(n => !links[n.id])

  const open = (id: string) => { setDraft(links[id] ?? ''); setEditing(id); setAdding(false); setFailed(false) }

  const save = async (id: string) => {
    const updated = { ...links, [id]: draft.trim() }
    if (!draft.trim()) delete updated[id]
    try {
      await api.patch('/users/me', { social_links: updated })
      setLinks(updated)
      setEditing(null)
    } catch {
      setFailed(true)
    }
  }

  const editor = (id: string) => (
    <div style={{ padding: 'var(--sp-2) 0' }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: 'var(--ctl-md)', padding: '0 var(--sp-3)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text)', fontSize: 'var(--fs-input)', fontFamily: 'var(--font)',
        }}
      />
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
        <button type="button" onClick={() => save(id)} style={{ minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', cursor: 'pointer' }}>salvar</button>
        <button type="button" onClick={() => setEditing(null)} style={{ minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', cursor: 'pointer' }}>cancelar</button>
      </div>
      {failed && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginTop: 'var(--sp-2)' }}>não foi possível salvar</div>}
    </div>
  )

  return (
    <Section label="redes" summary={filled.map(n => n.label).join(', ') || 'nenhuma'} collapsible>
      {filled.map(n => (
        editing === n.id
          ? <div key={n.id}>{editor(n.id)}</div>
          : <ListRow key={n.id} title={n.label} meta={links[n.id]} onClick={() => open(n.id)} />
      ))}
      {editing && !links[editing] && editor(editing)}
      {free.length > 0 && (
        <ListRow title="adicionar rede" onClick={() => setAdding(a => !a)} />
      )}
      {adding && free.map(n => <ListRow key={n.id} title={n.label} onClick={() => open(n.id)} />)}
    </Section>
  )
}

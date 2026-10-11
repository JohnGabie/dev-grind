import { useState } from 'react'
import api from '../../api/client'
import Section from '../Section'

const button = {
  minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', cursor: 'pointer', borderRadius: 'var(--radius-md)',
  fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', background: 'none',
} as const

export default function BioRow({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      await api.patch('/users/me', { bio: draft })
      setBio(draft.trim())
      setEditing(false)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section label="bio" summary={bio.split('\n')[0] || 'sem bio'} collapsible>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box', padding: 'var(--sp-3)', resize: 'vertical',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text)', fontSize: 'var(--fs-input)', lineHeight: 'var(--lh-input)', fontFamily: 'var(--font)',
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button type="button" disabled={saving} onClick={save} style={{ ...button, border: '1px solid rgba(34,211,238,0.3)', color: 'var(--cyan)' }}>salvar</button>
            <button type="button" onClick={() => { setEditing(false); setFailed(false) }} style={{ ...button, border: '1px solid var(--border)', color: 'var(--muted)' }}>cancelar</button>
          </div>
          {failed && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginTop: 'var(--sp-2)' }}>não foi possível salvar</div>}
        </div>
      ) : (
        <div>
          <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color: bio ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
            {bio || 'sem descrição'}
          </p>
          <button type="button" onClick={() => { setDraft(bio); setFailed(false); setEditing(true) }} style={{ ...button, marginTop: 'var(--sp-2)', border: '1px solid var(--border)', color: 'var(--cyan)' }}>
            editar
          </button>
        </div>
      )}
    </Section>
  )
}

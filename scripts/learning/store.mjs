import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export const KINDS = ['evidence', 'article', 'insight', 'finding', 'decision', 'hypothesis', 'dataset', 'research']
export const AREAS = ['content', 'practice', 'feedback', 'progress', 'rewards', 'ai', 'community', 'engagement', 'data']
export const STRENGTHS = ['strong', 'moderate', 'weak']
export const STATUSES = ['open', 'decided', 'rejected', 'done']

const SCHEMA = `
CREATE TABLE IF NOT EXISTS learning_entries (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  area        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  strength    TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  source_url  TEXT,
  refs        TEXT NOT NULL DEFAULT '{}',
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_kind_area ON learning_entries (kind, area);
`

export function openStore(path) {
  const db = new DatabaseSync(path)
  db.exec(SCHEMA)
  return db
}

function oneOf(field, value, allowed, optional = false) {
  if (optional && (value === undefined || value === null)) return
  if (!allowed.includes(value)) throw new Error(`${field} must be one of: ${allowed.join(', ')} (got '${value}')`)
}

function validate(entry, partial = false) {
  if (!partial || 'kind' in entry) oneOf('kind', entry.kind, KINDS)
  if (!partial || 'area' in entry) oneOf('area', entry.area, AREAS)
  if (!partial && !String(entry.title ?? '').trim()) throw new Error('title is required')
  if ('strength' in entry) oneOf('strength', entry.strength, STRENGTHS, true)
  if ('status' in entry) oneOf('status', entry.status, STATUSES, true)
}

function toRow(row) {
  return row && { ...row, refs: JSON.parse(row.refs), tags: JSON.parse(row.tags) }
}

export function addEntry(db, entry) {
  validate(entry)
  const now = new Date().toISOString()
  const id = randomUUID()
  db.prepare(`INSERT INTO learning_entries
    (id, kind, area, title, body, strength, status, source_url, refs, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, entry.kind, entry.area, entry.title.trim(), entry.body ?? '', entry.strength ?? null,
    entry.status ?? 'open', entry.source_url ?? null,
    JSON.stringify(entry.refs ?? {}), JSON.stringify(entry.tags ?? []), now, now,
  )
  return getEntry(db, id)
}

export function getEntry(db, id) {
  return toRow(db.prepare('SELECT * FROM learning_entries WHERE id = ?').get(id))
}

const UPDATABLE = ['kind', 'area', 'title', 'body', 'strength', 'status', 'source_url', 'refs', 'tags']

export function updateEntry(db, id, fields) {
  if (!getEntry(db, id)) throw new Error(`entry '${id}' not found`)
  const keys = Object.keys(fields).filter(k => UPDATABLE.includes(k))
  if (keys.length === 0) throw new Error(`nothing to update; allowed fields: ${UPDATABLE.join(', ')}`)
  validate(fields, true)
  const values = keys.map(k => (k === 'refs' || k === 'tags' ? JSON.stringify(fields[k]) : fields[k]))
  db.prepare(`UPDATE learning_entries SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
    .run(...values, new Date().toISOString(), id)
  return getEntry(db, id)
}

export function searchEntries(db, { kind, area, status, query, limit = 50 } = {}) {
  const where = []
  const args = []
  if (kind) { oneOf('kind', kind, KINDS); where.push('kind = ?'); args.push(kind) }
  if (area) { oneOf('area', area, AREAS); where.push('area = ?'); args.push(area) }
  if (status) { oneOf('status', status, STATUSES); where.push('status = ?'); args.push(status) }
  if (query) { where.push('(title LIKE ? OR body LIKE ?)'); args.push(`%${query}%`, `%${query}%`) }
  const sql = `SELECT * FROM learning_entries ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC, rowid DESC LIMIT ?`
  return db.prepare(sql).all(...args, Number(limit)).map(toRow)
}

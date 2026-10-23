import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openStore, addEntry, updateEntry, getEntry, searchEntries } from './store.mjs'

const finding = { kind: 'finding', area: 'practice', title: 'Failures not saved', body: 'ExercisePage.tsx:110' }

test('adding an entry stores it as open with empty refs and tags', () => {
  const db = openStore(':memory:')
  const entry = addEntry(db, finding)
  assert.equal(getEntry(db, entry.id).title, 'Failures not saved')
  assert.equal(entry.status, 'open')
  assert.deepEqual(entry.refs, {})
  assert.deepEqual(entry.tags, [])
})

test('search filters by kind and returns newest first', () => {
  const db = openStore(':memory:')
  addEntry(db, { kind: 'evidence', area: 'practice', title: 'Retrieval g = 0.50', strength: 'strong' })
  const first = addEntry(db, finding)
  const second = addEntry(db, { ...finding, title: 'Honor on every pass' })
  const found = searchEntries(db, { kind: 'finding' })
  assert.deepEqual(found.map(e => e.id), [second.id, first.id])
})

test('articles and insights are accepted kinds', () => {
  const db = openStore(':memory:')
  addEntry(db, { kind: 'article', area: 'ai', title: 'Bastani et al. 2025', source_url: 'https://example.org' })
  addEntry(db, { kind: 'insight', area: 'ai', title: 'Guardrails decide whether AI helps or harms' })
  assert.equal(searchEntries(db).length, 2)
})

test('search by text matches title and body', () => {
  const db = openStore(':memory:')
  const entry = addEntry(db, { kind: 'evidence', area: 'practice', title: 'Testing effect', body: 'retrieval practice g = 0.50' })
  assert.deepEqual(searchEntries(db, { query: 'retrieval' }).map(e => e.id), [entry.id])
})

test('an empty store returns an empty list', () => {
  assert.deepEqual(searchEntries(openStore(':memory:')), [])
})

test('updating changes the field and the timestamp', async () => {
  const db = openStore(':memory:')
  const entry = addEntry(db, finding)
  await new Promise(r => setTimeout(r, 5))
  const updated = updateEntry(db, entry.id, { status: 'decided', refs: { linear: ['DEV-1'] } })
  assert.equal(updated.status, 'decided')
  assert.deepEqual(updated.refs, { linear: ['DEV-1'] })
  assert.ok(updated.updated_at > entry.updated_at)
})

test('updating an unknown entry fails', () => {
  assert.throws(() => updateEntry(openStore(':memory:'), 'nope', { status: 'done' }), /not found/)
})

test('an invalid kind is refused and nothing is written', () => {
  const db = openStore(':memory:')
  assert.throws(() => addEntry(db, { ...finding, kind: 'gossip' }), /kind must be one of/)
  assert.deepEqual(searchEntries(db), [])
})

test('an invalid status on update is refused', () => {
  const db = openStore(':memory:')
  const entry = addEntry(db, finding)
  assert.throws(() => updateEntry(db, entry.id, { status: 'maybe' }), /status must be one of/)
  assert.equal(getEntry(db, entry.id).status, 'open')
})

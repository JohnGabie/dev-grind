#!/usr/bin/env node
// Learning Advisor's local table (docs/learning/learning.db). See docs/roles/learning-advisor.md.
// Usage:
//   node scripts/learning/learning.mjs add '{"kind":"finding","area":"practice","title":"...","body":"..."}'
//   node scripts/learning/learning.mjs update <id> '{"status":"decided"}'
//   node scripts/learning/learning.mjs get <id>
//   node scripts/learning/learning.mjs search '{"kind":"finding","query":"hint"}'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { openStore, addEntry, updateEntry, getEntry, searchEntries } from './store.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const db = openStore(resolve(root, 'docs', 'learning', 'learning.db'))
const [command, ...args] = process.argv.slice(2)
const json = text => (text ? JSON.parse(text) : {})

try {
  let result
  if (command === 'add') result = addEntry(db, json(args[0]))
  else if (command === 'update') result = updateEntry(db, args[0], json(args[1]))
  else if (command === 'get') result = getEntry(db, args[0]) ?? (() => { throw new Error(`entry '${args[0]}' not found`) })()
  else if (command === 'search') result = searchEntries(db, json(args[0]))
  else throw new Error('command must be one of: add, update, get, search')
  console.log(JSON.stringify(result, null, 2))
} catch (err) {
  console.error(`error: ${err.message}`)
  process.exitCode = 1
} finally {
  db.close()
}

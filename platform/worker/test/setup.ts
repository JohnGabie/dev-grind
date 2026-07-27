import { env } from 'cloudflare:test'
import { beforeAll } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(__dirname, '..', 'drizzle')

// Runs the real migration files against the in-memory D1, so tests fail when a
// migration is missing rather than when a hand-written schema drifts.
beforeAll(async () => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && /^\d{4}_/.test(f))
    .sort()

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim()
      if (trimmed) await env.DB.exec(trimmed.replace(/\n/g, ' '))
    }
  }
})

import { defineConfig } from 'vitest/config'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import path from 'node:path'

// The real migration files run against the test D1, so a missing migration
// fails the suite instead of silently drifting from a hand-written schema.
const migrations = await readD1Migrations(path.join(__dirname, 'drizzle'))

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-05-01',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['DB'],
        r2Buckets: ['BOOKS'],
        bindings: {
          JWT_SECRET: 'test-secret',
          ENV: 'development',
          GOOGLE_CLIENT_ID: '',
          ALLOWED_EMAILS: '',
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/setup.ts'],
  },
})

import type { Config } from 'drizzle-kit'

export default {
  dialect: 'sqlite',
  schema:  './src/db/schema.ts',
  out:     './drizzle',
  dbCredentials: {
    // Local SQLite for development.
    // When migrating to D1: apply the generated SQL via
    // `wrangler d1 migrations apply devgrind` instead of running db:migrate.
    url: './local.db',
  },
} satisfies Config

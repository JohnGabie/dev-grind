import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          compatibilityDate: '2026-05-01',
          d1Databases: ['DB'],
          r2Buckets: ['BOOKS'],
          bindings: {
            JWT_SECRET: 'test-secret',
            ENV: 'development',
            GOOGLE_CLIENT_ID: '',
            ALLOWED_EMAILS: '',
          },
        },
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
})

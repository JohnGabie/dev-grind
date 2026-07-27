/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { D1Migration } from '@cloudflare/vitest-pool-workers'
// Aliased: a bare `Env` would resolve to the empty global from workers-types.
import type { Env as WorkerEnv } from '../src/types'

// `env` from "cloudflare:test" is typed as Cloudflare.Env — declare what the
// test worker actually binds.
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}

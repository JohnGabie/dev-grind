export interface Env {
  DB: D1Database
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  ALLOWED_EMAILS: string  // comma-separated, empty = allow all
  ENV: string             // 'production' | 'development'
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    userId: string
  }
}

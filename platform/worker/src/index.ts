import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth'
import exercisesRoutes from './routes/exercises'
import submissionsRoutes from './routes/submissions'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://devgrind.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', c => c.json({ status: 'ok', api: 'DevGrind' }))

app.route('/auth', authRoutes)
app.route('/exercises', exercisesRoutes)
app.route('/submissions', submissionsRoutes)

export default app

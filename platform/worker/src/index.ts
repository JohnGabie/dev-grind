import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth'
import exercisesRoutes from './routes/exercises'
import submissionsRoutes from './routes/submissions'
import usersRoutes from './routes/users'
import progressRoutes from './routes/progress'
import storeRoutes from './routes/store'
import coursesRoutes from './routes/courses'
import profileRoutes from './routes/profile'
import booksRoutes from './routes/books'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://devgrind.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', c => c.json({ status: 'ok', api: 'DevGrind' }))

app.route('/auth', authRoutes)
app.route('/exercises', exercisesRoutes)
app.route('/submissions', submissionsRoutes)
app.route('/users', usersRoutes)
app.route('/progress', progressRoutes)
app.route('/store', storeRoutes)
app.route('/courses', coursesRoutes)
app.route('/profile', profileRoutes)
app.route('/books', booksRoutes)

export default app

import { Hono } from 'hono'
import { getDb } from '../db'
import { deleteRoadmap, failed, listRoadmaps } from '../lib/roadmaps'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

router.get('/', requireAuth, async (c) => {
  return c.json(await listRoadmaps(getDb(c.env), c.get('userId')))
})

router.delete('/:id', requireAuth, async (c) => {
  const deleteCourses = c.req.query('delete_courses') === 'true'
  const result = await deleteRoadmap(getDb(c.env), c.get('userId'), c.req.param('id') ?? '', deleteCourses)
  if (failed(result)) return c.json({ detail: result.error }, 404)
  return c.json(result)
})

export default router

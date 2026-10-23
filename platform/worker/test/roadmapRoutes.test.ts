import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { USER_ID, anon, authed, callTool, jwtFor, personalToken, resetDb, seedCourse, seedUser } from './helpers'

async function makeRoadmap(token: string, title: string, ids: string[]): Promise<{ id: string }> {
  return await callTool(token, 'create_roadmap', { title, course_ids: ids })
}

describe('roadmap routes', () => {
  let token: string

  beforeEach(async () => {
    await resetDb()
    await seedUser()
    token = await personalToken()
    for (const id of ['A', 'B', 'C']) await seedCourse(id)
  })

  it('requires a login', async () => {
    expect((await anon('/roadmaps')).status).toBe(401)
    expect((await anon('/roadmaps/x', { method: 'DELETE' })).status).toBe(401)
    expect((await anon('/courses/A', { method: 'DELETE' })).status).toBe(401)
  })

  it('lists the user\'s roadmaps with ordered course ids', async () => {
    const r = await makeRoadmap(token, 'Backend', ['B', 'A'])
    const res = await authed('/roadmaps')
    expect(res.status).toBe(200)
    const rows = await res.json<Array<{ id: string; title: string; course_ids: string[] }>>()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: r.id, title: 'Backend', course_ids: ['B', 'A'] })
  })

  it('deleting a roadmap keeps its courses by default', async () => {
    const r = await makeRoadmap(token, 'R', ['A', 'B'])
    const res = await authed(`/roadmaps/${r.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(3)
  })

  it('delete_courses=true deletes the courses too', async () => {
    const r = await makeRoadmap(token, 'R', ['A', 'B'])
    const res = await authed(`/roadmaps/${r.id}?delete_courses=true`, { method: 'DELETE' })
    expect(await res.json()).toEqual({ deleted_roadmap: r.id, deleted_courses: 2 })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(1)
  })

  it('another user gets 404 and nothing changes', async () => {
    await seedUser('other')
    const r = await makeRoadmap(token, 'Mine', ['A'])
    const otherJwt = await jwtFor('other')
    expect((await authed(`/roadmaps/${r.id}?delete_courses=true`, { method: 'DELETE', token: otherJwt })).status).toBe(404)
    expect((await authed('/courses/A', { method: 'DELETE', token: otherJwt })).status).toBe(404)
    expect(await (await authed('/roadmaps', { token: otherJwt })).json()).toEqual([])
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(3)
  })

  it('an unknown roadmap or course is a 404', async () => {
    expect((await authed('/roadmaps/nope', { method: 'DELETE' })).status).toBe(404)
    expect((await authed('/courses/nope', { method: 'DELETE' })).status).toBe(404)
  })

  it('DELETE /courses/:id removes progress and every roadmap link, and compacts', async () => {
    const one = await makeRoadmap(token, 'One', ['A', 'B', 'C'])
    await env.DB.prepare("INSERT INTO course_lesson_progress (user_id, course_id, lesson_key) VALUES (?, 'B', '0-0')").bind(USER_ID).run()
    const res = await authed('/courses/B', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted_course: 'B' })
    const progress = await env.DB.prepare("SELECT COUNT(*) AS n FROM course_lesson_progress WHERE course_id = 'B'").first<{ n: number }>()
    expect(progress?.n).toBe(0)
    const rows = await (await authed('/roadmaps')).json<Array<{ id: string; course_ids: string[] }>>()
    expect(rows.find(r => r.id === one.id)?.course_ids).toEqual(['A', 'C'])
    const list = await (await authed('/courses')).json<Array<{ id: string }>>()
    expect(list.map(c => c.id).sort()).toEqual(['A', 'C'])
  })
})

import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { USER_ID, authed, json, resetDb, seedUser } from './helpers'

const modules = JSON.stringify([{
  title: 'S',
  lessons: [{
    title: 'Variável',
    steps: [
      { type: 'text', body: 'a' },
      { type: 'text', body: 'b' },
      { type: 'text', body: 'c' },
    ],
  }],
}])

describe('lesson parts', () => {
  beforeEach(async () => {
    await resetDb()
    await seedUser()
    await env.DB.prepare('INSERT INTO courses (id, user_id, title, modules) VALUES (?, ?, ?, ?)')
      .bind('course-1', USER_ID, 'Python', modules).run()
  })

  it('saves part progress without finishing the lesson', async () => {
    const saved = await authed('/courses/course-1/lessons/0-0/progress', json({ parts_done: 1 }))
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual({ finished: false, parts_done: 1 })

    const listed = await authed('/courses')
    const [course] = await listed.json<Array<{ completed_lessons: string[]; lesson_parts: Record<string, number> }>>()
    expect(course.completed_lessons).toEqual([])
    expect(course.lesson_parts).toEqual({ '0-0': 1 })

    const tooFar = await authed('/courses/course-1/lessons/0-0/progress', json({ parts_done: 3 }))
    expect(tooFar.status).toBe(400)

    const back = await authed('/courses/course-1/lessons/0-0/progress', json({ parts_done: 0 }))
    expect(await back.json()).toEqual({ finished: false, parts_done: 1 })

    const done = await authed('/courses/course-1/lessons/0-0/complete', { method: 'POST' })
    expect(await done.json()).toMatchObject({ completed: true, already: false })

    const after = await authed('/courses')
    const [finished] = await after.json<Array<{ completed_lessons: string[]; lesson_parts: Record<string, number> }>>()
    expect(finished.completed_lessons).toEqual(['0-0'])
    expect(finished.lesson_parts).toEqual({})

    const again = await authed('/courses/course-1/lessons/0-0/progress', json({ parts_done: 1 }))
    expect(await again.json()).toEqual({ finished: true, parts_done: 3 })
  })

  it('does not write progress on another user course', async () => {
    await seedUser('other', 'other@test.dev')
    await env.DB.prepare('INSERT INTO courses (id, user_id, title, modules) VALUES (?, ?, ?, ?)')
      .bind('theirs', 'other', 'Deles', modules).run()
    const res = await authed('/courses/theirs/lessons/0-0/progress', json({ parts_done: 1 }))
    expect(res.status).toBe(404)
  })
})

import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach } from 'vitest'
import { USER_ID, authed, json, resetDb, seedExercise, seedUser } from './helpers'

async function honor(userId = USER_ID): Promise<number> {
  const row = await env.DB.prepare('SELECT honor FROM users WHERE id = ?').bind(userId).first<{ honor: number }>()
  return row?.honor ?? 0
}

describe('submissions', () => {
  beforeEach(async () => {
    await resetDb()
    await seedUser()
  })

  it('stores a submission and awards honor by difficulty', async () => {
    const { id } = await seedExercise({ difficulty: '6kyu' })

    const res = await authed('/submissions', json({
      exercise_id: id, code: 'x', status: 'passed', test_results: [{ passed: true }],
    }))

    expect(res.status).toBe(201)
    expect((await res.json<any>()).honor_gained).toBe(8)
    expect(await honor()).toBe(8)
  })

  it('awards no honor for a failed submission', async () => {
    const { id } = await seedExercise({ difficulty: '6kyu' })

    const res = await authed('/submissions', json({
      exercise_id: id, code: 'x', status: 'failed', test_results: [{ passed: false }],
    }))

    expect((await res.json<any>()).honor_gained).toBe(0)
    expect(await honor()).toBe(0)
  })

  it('counts attempts and completions per day', async () => {
    const { id } = await seedExercise()

    await authed('/submissions', json({ exercise_id: id, code: 'x', status: 'failed', test_results: [] }))
    await authed('/submissions', json({ exercise_id: id, code: 'x', status: 'passed', test_results: [] }))

    const row = await env.DB.prepare(
      'SELECT exercises_attempted, exercises_completed FROM daily_progress WHERE user_id = ?',
    ).bind(USER_ID).first<{ exercises_attempted: number; exercises_completed: number }>()

    expect(row?.exercises_attempted).toBe(2)
    expect(row?.exercises_completed).toBe(1)
  })

  it('rejects a submission for an unknown exercise', async () => {
    const res = await authed('/submissions', json({
      exercise_id: 'does-not-exist', code: 'x', status: 'passed', test_results: [],
    }))
    expect(res.status).toBe(404)
  })

  it('only returns the calling user submissions', async () => {
    const { id } = await seedExercise()
    await seedUser('other-user', 'other@test.dev')

    await authed('/submissions', json({ exercise_id: id, code: 'mine', status: 'passed', test_results: [] }))

    const { jwtFor } = await import('./helpers')
    const res = await authed(`/submissions/exercise/${id}`, { token: await jwtFor('other-user') })
    expect(await res.json()).toEqual([])
  })
})

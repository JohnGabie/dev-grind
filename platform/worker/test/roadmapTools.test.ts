import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { TOOLS } from '../src/lib/tools'
import { callTool, personalToken, resetDb, seedCourse, seedUser } from './helpers'

describe('roadmap MCP tools', () => {
  let token: string

  beforeEach(async () => {
    await resetDb()
    await seedUser()
    token = await personalToken()
    for (const id of ['A', 'B', 'C', 'D']) await seedCourse(id)
  })

  it('registers the eight tools with a delete warning', () => {
    const names = TOOLS.map(t => t.name)
    for (const name of ['list_courses', 'list_roadmaps', 'create_roadmap', 'update_roadmap', 'add_courses_to_roadmap', 'remove_courses_from_roadmap', 'reorder_roadmap_courses', 'delete_roadmap']) {
      expect(names).toContain(name)
    }
    const del = TOOLS.find(t => t.name === 'delete_roadmap')!
    expect(del.description).toMatch(/permanent|for good/i)
    expect(JSON.stringify(del.inputSchema)).toMatch(/delete_courses/)
  })

  it('list_courses gives the AI the ids it needs', async () => {
    const list = await callTool(token, 'list_courses')
    expect(list).toHaveLength(4)
    expect(Object.keys(list[0]).sort()).toEqual(['created_at', 'description', 'id', 'lesson_count', 'title'])
  })

  it('creates a folder with or without courses', async () => {
    const empty = await callTool(token, 'create_roadmap', { title: 'Backend' })
    expect(empty.course_ids).toEqual([])
    const web = await callTool(token, 'create_roadmap', { title: 'Web', course_ids: ['B', 'A'] })
    expect(web.course_ids).toEqual(['B', 'A'])
    const listed = await callTool(token, 'list_roadmaps')
    expect(listed.map((r: { title: string }) => r.title).sort()).toEqual(['Backend', 'Web'])
  })

  it('add, remove and reorder keep the order consistent', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B', 'C'] })
    const added = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ['D'], position: 1 })
    expect(added.course_ids).toEqual(['A', 'D', 'B', 'C'])
    const removed = await callTool(token, 'remove_courses_from_roadmap', { roadmap_id: r.id, course_ids: ['D'] })
    expect(removed.course_ids).toEqual(['A', 'B', 'C'])
    const reordered = await callTool(token, 'reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['C', 'A', 'B'] })
    expect(reordered.course_ids).toEqual(['C', 'A', 'B'])
  })

  it('reorder must name exactly the members', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
    const bad = await callTool(token, 'reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['A'] })
    expect(bad.error).toMatch(/missing/)
    const same = await callTool(token, 'list_roadmaps')
    expect(same[0].course_ids).toEqual(['A', 'B'])
  })

  it('unknown or foreign course ids fail the whole call', async () => {
    await seedUser('other')
    await seedCourse('theirs', 'other')
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A'] })
    for (const ids of [['B', 'nope'], ['theirs']]) {
      const res = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ids })
      expect(res.error).toMatch(/Unknown course ids/)
    }
    const same = await callTool(token, 'list_roadmaps')
    expect(same[0].course_ids).toEqual(['A'])
  })

  it('update_roadmap changes title and keeps the courses', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'Old', course_ids: ['A'] })
    const updated = await callTool(token, 'update_roadmap', { roadmap_id: r.id, title: 'New' })
    expect(updated).toMatchObject({ title: 'New', course_ids: ['A'] })
    const empty = await callTool(token, 'update_roadmap', { roadmap_id: r.id })
    expect(empty.error).toMatch(/nothing to update/)
  })

  it('delete_roadmap keeps courses unless asked', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
    const kept = await callTool(token, 'delete_roadmap', { roadmap_id: r.id })
    expect(kept).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
    expect(await callTool(token, 'list_courses')).toHaveLength(4)

    const r2 = await callTool(token, 'create_roadmap', { title: 'R2', course_ids: ['A', 'B'] })
    const gone = await callTool(token, 'delete_roadmap', { roadmap_id: r2.id, delete_courses: true })
    expect(gone).toEqual({ deleted_roadmap: r2.id, deleted_courses: 2 })
    expect(await callTool(token, 'list_courses')).toHaveLength(2)
  })

  it('delete_roadmap ignores a delete_courses that is not boolean true', async () => {
    for (const value of ['true', 1]) {
      const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
      const res = await callTool(token, 'delete_roadmap', { roadmap_id: r.id, delete_courses: value })
      expect(res).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
      expect(await callTool(token, 'list_courses')).toHaveLength(4)
    }
  })

  it('add_courses_to_roadmap rejects a bad position or bad course_ids', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
    for (const position of [-1, '1']) {
      const res = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ['C'], position })
      expect(res.error).toMatch(/position/)
    }
    for (const course_ids of [null, 'A']) {
      const res = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids })
      expect(res.error).toMatch(/course_ids/)
    }
    const same = await callTool(token, 'list_roadmaps')
    expect(same[0].course_ids).toEqual(['A', 'B'])
  })

  it('another user\'s roadmap is not found', async () => {
    await seedUser('other')
    const otherToken = await personalToken('other')
    const r = await callTool(token, 'create_roadmap', { title: 'Mine', course_ids: ['A'] })
    for (const [name, args] of [
      ['update_roadmap', { roadmap_id: r.id, title: 'x' }],
      ['add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ['A'] }],
      ['remove_courses_from_roadmap', { roadmap_id: r.id, course_ids: ['A'] }],
      ['reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['A'] }],
      ['delete_roadmap', { roadmap_id: r.id, delete_courses: true }],
    ] as const) {
      const res = await callTool(otherToken, name, args)
      expect(res.error).toMatch(/not found or not yours/)
    }
    expect(await callTool(otherToken, 'list_roadmaps')).toEqual([])
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(row?.n).toBe(4)
  })
})

import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach } from 'vitest'
import { USER_ID, anon, authed, callTool, mcp, personalToken, resetDb, seedExercise, seedUser } from './helpers'
import { TOOLS } from '../src/lib/tools'

describe('mcp', () => {
  let token: string

  beforeEach(async () => {
    await resetDb()
    await seedUser()
    token = await personalToken()
  })

  it('rejects calls without a personal token', async () => {
    const res = await anon('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects a token that was never issued', async () => {
    const { status } = await mcp('not-a-real-token', 'tools/list')
    expect(status).toBe(401)
  })

  it('rejects a revoked token', async () => {
    await resetDb()
    const { status } = await mcp(token, 'tools/list')
    expect(status).toBe(401)
  })

  it('never stores the raw token', async () => {
    const row = await env.DB.prepare('SELECT token_hash FROM personal_tokens').first<{ token_hash: string }>()
    expect(row?.token_hash).not.toBe(token)
    expect(row?.token_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handshakes and lists every registered tool', async () => {
    const init = await mcp(token, 'initialize')
    expect(init.body.result.protocolVersion).toBe('2024-11-05')

    const list = await mcp(token, 'tools/list')
    expect(list.body.result.tools).toHaveLength(TOOLS.length)
  })

  it('reports an unknown method as JSON-RPC error', async () => {
    const { body } = await mcp(token, 'does/not/exist')
    expect(body.error.code).toBe(-32601)
  })

  it('creates an exercise the app can then read', async () => {
    const created = await callTool(token, 'create_exercise', {
      title: 'Status HTTP', description: 'desc', difficulty: '7kyu',
      tags: ['http'], stub: 'def f(): pass',
      test_cases: [{ description: 't', input: '[]', expected: '1', visible: true }],
    })
    expect(created.slug).toBe('status-http')

    const res = await authed('/exercises')
    const slugs = (await res.json<any[]>()).map(e => e.slug)
    expect(slugs).toContain('status-http')
  })

  it('gives a created exercise a unique slug', async () => {
    const args = {
      title: 'Mesmo Titulo', description: 'd', difficulty: '8kyu',
      tags: [], stub: '', test_cases: [],
    }
    expect((await callTool(token, 'create_exercise', args)).slug).toBe('mesmo-titulo')
    expect((await callTool(token, 'create_exercise', args)).slug).toBe('mesmo-titulo-1')
  })

  it('records a solution submitted through a model', async () => {
    const { slug } = await seedExercise({ difficulty: '7kyu', slug: 'kata-x' })

    const result = await callTool(token, 'submit_solution', {
      slug, code: 'def f(): return 1', passed: true, test_results: [{ passed: true }],
    })

    expect(result.status).toBe('passed')
    expect(result.honor_gained).toBe(4)

    const stats = await authed('/users/me/stats')
    expect((await stats.json<any>()).honor).toBe(4)
  })

  it('marks a partially passing solution as partial', async () => {
    const { slug } = await seedExercise({ slug: 'kata-partial' })
    const result = await callTool(token, 'submit_solution', {
      slug, code: 'x', passed: false, test_results: [{ passed: true }, { passed: false }],
    })
    expect(result.status).toBe('partial')
    expect(result.honor_gained).toBe(0)
  })

  it('creates a profile and reads it back', async () => {
    await callTool(token, 'create_profile', {
      strengths: [], gaps: [{ concept: 'sql:joins', severity: 3 }],
      level: {}, style: {}, notes: [], recommendations: [],
    })

    const profile = await callTool(token, 'get_profile')
    expect(profile.baseline_done).toBe(true)
    expect(profile.gaps).toHaveLength(1)

    const ctx = await callTool(token, 'get_context')
    expect(ctx.profile_summary.top_gaps).toContain('sql:joins')
  })

  it('refuses to update an unknown profile field', async () => {
    await callTool(token, 'create_profile', {
      strengths: [], gaps: [], level: {}, style: {}, notes: [], recommendations: [],
    })
    const res = await callTool(token, 'update_profile', { field: 'honor', data: 9999 })
    expect(res.error).toMatch(/Unknown field/)
  })

  it('computes concept pass rate and flags thin samples', async () => {
    const { id } = await seedExercise({ concepts: ['http:status-codes'] })
    for (const status of ['passed', 'failed', 'failed']) {
      await authed('/submissions', {
        method: 'POST',
        body: JSON.stringify({ exercise_id: id, code: 'x', status, test_results: [] }),
      })
    }

    const analytics = await callTool(token, 'get_analytics')
    const concept = analytics.concepts.find((c: any) => c.concept === 'http:status-codes')
    expect(concept.attempted).toBe(3)
    expect(concept.rate).toBeCloseTo(1 / 3)
    expect(concept.reliable).toBe(false)
    expect(analytics.gaps).not.toContain('http:status-codes')
  })

  it('writes an insight the dashboard can read', async () => {
    await callTool(token, 'write_insight', { message: 'Bom ritmo.', highlights: ['a'], gaps: ['b'] })

    const res = await authed('/agent/insights')
    const [insight] = await res.json<any[]>()
    expect(insight.message).toBe('Bom ritmo.')
    expect(insight.gaps).toEqual(['b'])
  })

  it('cannot reach another user data through a personal token', async () => {
    await seedUser('victim', 'victim@test.dev')
    await env.DB.prepare(`
      INSERT INTO books (id, user_id, slug, title, author, content_type, file_path, text_path)
      VALUES ('b1', 'victim', 'segredo', 'Segredo', 'A', 'pdf', 'p', 't')
    `).run()

    expect(await callTool(token, 'get_books')).toEqual([])
    const content = await callTool(token, 'get_book_content', { slug: 'segredo', page: 1 })
    expect(content.error).toMatch(/not found or not yours/)
  })

  it('stores optional true only when the lesson sets boolean true', async () => {
    const created = await callTool(token, 'create_course', {
      title: 'Curso teste',
      description: 'desc',
      is_complete: false,
      modules: [{
        title: 'Seção',
        lessons: [
          { title: 'Obrigatória', steps: [{ type: 'text', body: 'a' }] },
          { title: 'Um extra', optional: true, steps: [{ type: 'text', body: 'b' }] },
        ],
      }],
    })

    const res = await authed('/courses')
    expect(res.status).toBe(200)
    const rows = await res.json<Array<{ id: string; modules: Array<{ lessons: Array<Record<string, unknown>> }> }>>()
    const course = rows.find(row => row.id === created.id)
    expect(course?.modules[0].lessons[0].optional).toBeUndefined()
    expect(course?.modules[0].lessons[1].optional).toBe(true)

    await callTool(token, 'append_course_modules', {
      course_id: created.id,
      is_complete: false,
      modules: [{ title: 'Mais', lessons: [{ title: 'Extra 2', optional: true, steps: [{ type: 'text', body: 'c' }] }] }],
    })
    const again = await authed('/courses')
    const rows2 = await again.json<Array<{ id: string; modules: Array<{ lessons: Array<Record<string, unknown>> }> }>>()
    const updated = rows2.find(row => row.id === created.id)
    expect(updated?.modules[1].lessons[0].optional).toBe(true)

    const list = await mcp(token, 'tools/list')
    const tools = list.body.result.tools as Array<{
      name: string
      description: string
      inputSchema: { properties: { modules?: { description: string } } }
    }>
    const create = tools.find(tool => tool.name === 'create_course')
    const append = tools.find(tool => tool.name === 'append_course_modules')
    expect(create?.description).toContain('A lesson is required unless it sets optional to boolean true. optional is a property of the lesson, not a step type. Absence means required.')
    expect(append?.description).toContain('Lessons may set optional: true, same as create_course. Absence means required.')
    expect(create?.inputSchema.properties.modules?.description).toContain('optional?: true')
    expect(append?.inputSchema.properties.modules?.description).toContain('optional: true')
  })

  it('keeps the tool registry and the claude-md instructions in sync', async () => {
    const res = await authed('/auth/tokens/claude-md')
    const text = await res.text()
    for (const tool of TOOLS) expect(text).toContain(tool.name)
  })
})

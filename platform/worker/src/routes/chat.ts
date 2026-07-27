/**
 * In-app chat. Same tools as the MCP server, different transport: the user's own
 * model key is sent per request (OpenRouter by default) and never stored.
 */
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { users } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { TOOLS, dispatch, type ToolCtx } from '../lib/tools'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const MAX_TOOL_ROUNDS = 8

const OPENAI_TOOLS = TOOLS.map(t => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.inputSchema },
}))

interface ChatBody {
  message: string
  history?: { role: string; content: string }[]
  api_key: string
  base_url?: string
  model?: string
}

function systemPrompt(name: string): string {
  return `You are a backend learning assistant for ${name}. ` +
    'The user is learning Python, FastAPI, SQL, and HTTP on DevGrind. ' +
    'You have tools to access their exercises, progress, books, and learning profile. ' +
    'Keep answers concise and practical. Answer in Portuguese unless the user writes in English.\n\n' +
    '## Session start protocol\n' +
    '1. Call get_context() — this returns a profile_summary.\n' +
    '2. If profile_summary.baseline_done is false: conduct a brief diagnostic assessment ' +
    '(3-5 open questions about code/concepts, at least one requiring code reading). ' +
    'After gathering enough observations, call create_profile() with your analysis. ' +
    "Then confirm: 'Registrei seu perfil inicial. Identifiquei X lacunas prioritárias.'\n" +
    '3. If profile_summary.baseline_done is true: use the profile to personalize your responses.\n\n' +
    '## Profile usage rules\n' +
    '- Before creating an exercise or course, call get_profile() and use gaps as concept targets ' +
    'and style to calibrate difficulty and tone.\n' +
    '- During a session, if you observe something significant about the understanding ' +
    '(correct intuition, wrong concept, vocabulary gap), call add_profile_note().\n' +
    '- If results contradict profile gaps (e.g. all sql:joins exercises now pass), ' +
    "call update_profile('gaps', updated_gaps_list) to reflect the improvement.\n" +
    '- Recommendations in the profile should drive book and content suggestions.'
}

router.post('/', requireAuth, async (c) => {
  const body = await c.req.json<ChatBody>().catch(() => null)
  if (!body?.api_key?.trim()) return c.json({ detail: 'api_key required' }, 422)

  const userId = c.get('userId')
  const db = getDb(c.env)
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  const baseUrl = (body.base_url ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
  const model = body.model ?? 'anthropic/claude-opus-4-5'
  const ctx: ToolCtx = { db, env: c.env, userId }

  const messages: Record<string, unknown>[] = [
    { role: 'system', content: systemPrompt(user?.name ?? 'the user') },
    ...(body.history ?? []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: body.message },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${body.api_key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      return c.json({ detail: `Upstream ${res.status}: ${await res.text()}` }, 502)
    }

    const data = await res.json<any>()
    const choice = data.choices?.[0]
    if (!choice) return c.json({ detail: 'Empty response from model' }, 502)

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length) {
      messages.push(choice.message)

      for (const call of choice.message.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(call.function?.arguments || '{}') } catch { args = {} }
        const result = await dispatch(call.function?.name ?? '', args, ctx)
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
      continue
    }

    return c.json({ response: choice.message?.content ?? '', rounds: round + 1 })
  }

  return c.json({ detail: `Tool loop exceeded ${MAX_TOOL_ROUNDS} rounds` }, 508)
})

export default router

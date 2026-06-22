import { Hono } from 'hono'
import { eq, desc, and } from 'drizzle-orm'
import { getDb } from '../db'
import { books } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// GET /books
router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const rows = await db.select().from(books)
    .where(eq(books.user_id, userId))
    .orderBy(desc(books.created_at))

  return c.json(rows.map(b => ({
    slug: b.slug,
    title: b.title,
    author: b.author,
    year: b.year,
    phase: b.phase,
    available: true,
    progress: 0,
    cover_url: b.cover_path ? `/books/${b.slug}/cover` : null,
    content_type: b.content_type,
  })))
})

// POST /books/upload
router.post('/upload', requireAuth, async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const r2 = c.env.BOOKS

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const cover = formData.get('cover') as File | null
  const title = (formData.get('title') as string | null)?.trim()
  const author = (formData.get('author') as string | null)?.trim()
  const year = formData.get('year') as string | null
  const phase = formData.get('phase') as string | null

  if (!file || !title || !author) {
    return c.json({ detail: 'file, title e author são obrigatórios' }, 400)
  }

  const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'md'
  const content_type = ext === 'pdf' ? 'pdf' : 'markdown'

  // Unique slug
  let base = slugify(title)
  const existing = await db.select({ slug: books.slug }).from(books).where(eq(books.user_id, userId))
  const taken = new Set(existing.map(r => r.slug))
  let slug = base
  let i = 1
  while (taken.has(slug)) slug = `${base}-${i++}`

  // Upload book file to R2
  const fileKey = `${userId}/${slug}/file.${ext}`
  await r2.put(fileKey, file.stream(), {
    httpMetadata: {
      contentType: ext === 'pdf' ? 'application/pdf' : 'text/markdown; charset=utf-8',
    },
  })

  // Upload cover to R2 (optional)
  let cover_path: string | null = null
  if (cover && cover.size > 0) {
    const coverExt = cover.name.split('.').pop() ?? 'jpg'
    const coverKey = `${userId}/${slug}/cover.${coverExt}`
    await r2.put(coverKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || 'image/jpeg' },
    })
    cover_path = coverKey
  }

  await db.insert(books).values({
    id: crypto.randomUUID(),
    user_id: userId,
    slug,
    title,
    author,
    year: year ? parseInt(year) : null,
    phase: phase ? parseInt(phase) : null,
    content_type,
    file_path: fileKey,
    cover_path,
    text_path: null,
  })

  return c.json({ slug, title, author, content_type }, 201)
})

// GET /books/:slug
router.get('/:slug', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book) return c.json({ error: 'not found' }, 404)

  let content: string | null = null
  if (book.content_type === 'markdown') {
    const obj = await c.env.BOOKS.get(book.file_path)
    content = obj ? await obj.text() : null
  }

  return c.json({
    slug: book.slug,
    title: book.title,
    author: book.author,
    year: book.year,
    phase: book.phase,
    content_type: book.content_type,
    content,
    cover_url: book.cover_path ? `/books/${slug}/cover` : null,
    has_text: Boolean(book.text_path),
  })
})

// GET /books/:slug/pdf
router.get('/:slug/pdf', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book || book.content_type !== 'pdf') return c.json({ error: 'not found' }, 404)

  const obj = await c.env.BOOKS.get(book.file_path)
  if (!obj) return c.json({ error: 'file not found in storage' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

// GET /books/:slug/cover
router.get('/:slug/cover', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book || !book.cover_path) return c.json({ error: 'no cover' }, 404)

  const obj = await c.env.BOOKS.get(book.cover_path)
  if (!obj) return c.json({ error: 'cover not found in storage' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=86400',
    },
  })
})

// GET /books/:slug/text?page=N
router.get('/:slug/text', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book) return c.json({ error: 'not found' }, 404)
  if (!book.text_path) return c.json({ error: 'text not extracted yet' }, 404)

  const page = parseInt(c.req.query('page') ?? '1')
  const textKey = `${userId}/${slug}/text/page-${page}.json`
  const obj = await c.env.BOOKS.get(textKey)
  if (!obj) return c.json({ error: 'page not found', pages: 0 }, 404)

  return c.json(await obj.json())
})

// POST /books/:slug/extract-text — not supported in Worker
router.post('/:slug/extract-text', requireAuth, async (_c) => {
  return c.json({ error: 'Text extraction is not available in this environment. Read the PDF directly.' }, 501)
})

// DELETE /books/:slug
router.delete('/:slug', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''
  const r2 = c.env.BOOKS

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book) return c.json({ error: 'not found' }, 404)

  const keysToDelete = [book.file_path, book.cover_path, book.text_path].filter(Boolean) as string[]
  await Promise.all(keysToDelete.map(key => r2.delete(key)))
  await db.delete(books).where(eq(books.id, book.id))

  return c.json({ ok: true })
})

export default router

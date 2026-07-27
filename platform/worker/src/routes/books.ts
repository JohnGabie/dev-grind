import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db'
import { books } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import {
  MAX_PDF_BYTES, deleteBookObjects, evictIfNearLimit, gunzipIfNeeded, gzip,
  ownedBook, pdfCount, pdfSlotLimit, storeCoverFromUrl, uniqueSlug,
} from '../lib/books'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const coverUrlFor = (slug: string, coverPath: string | null) =>
  coverPath ? `/books/${slug}/cover` : null

// GET /books
router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')

  const [rows, slot_limit] = await Promise.all([
    db.select().from(books).where(eq(books.user_id, userId)).orderBy(desc(books.created_at)),
    pdfSlotLimit(db, userId),
  ])

  return c.json({
    slot_limit,
    books: rows.map(b => ({
      slug: b.slug,
      title: b.title,
      author: b.author,
      year: b.year,
      phase: b.phase,
      available: true,
      progress: 0,
      cover_url: coverUrlFor(b.slug, b.cover_path),
      content_type: b.content_type,
    })),
  })
})

// POST /books/upload
router.post('/upload', requireAuth, async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const r2 = c.env.BOOKS

  const form = await c.req.formData().catch(() => null)
  if (!form) return c.json({ detail: 'Envie os campos como multipart/form-data.' }, 400)

  const file = form.get('file') as File | null
  const cover = form.get('cover') as File | null
  const coverUrl = (form.get('cover_url') as string | null)?.trim() || null
  const title = (form.get('title') as string | null)?.trim()
  const author = (form.get('author') as string | null)?.trim()
  const year = form.get('year') as string | null
  const phase = form.get('phase') as string | null

  if (!file || !title || !author) {
    return c.json({ detail: 'file, title e author são obrigatórios' }, 400)
  }

  const isPdf = file.name.toLowerCase().endsWith('.pdf')

  if (isPdf && file.size > MAX_PDF_BYTES) {
    return c.json({ detail: `PDF muito grande. Máximo permitido: ${MAX_PDF_BYTES / 1024 / 1024}MB.` }, 413)
  }

  // Compress first so quota checks see the size that will actually be stored.
  let body: ArrayBuffer | ReadableStream
  let storedSize = file.size
  let httpMetadata: Record<string, string>

  if (isPdf) {
    const compressed = await gzip(await file.arrayBuffer())
    body = compressed
    storedSize = compressed.byteLength
    httpMetadata = { contentType: 'application/pdf', contentEncoding: 'gzip' }
  } else {
    body = file.stream()
    httpMetadata = { contentType: 'text/markdown; charset=utf-8' }
  }

  if (isPdf) {
    const [used, limit] = await Promise.all([pdfCount(db, userId), pdfSlotLimit(db, userId)])
    if (used >= limit) {
      return c.json({ detail: `Limite de ${limit} PDFs atingido. Compre mais slots na loja.` }, 429)
    }
    await evictIfNearLimit(db, r2, storedSize)
  }

  const slug = await uniqueSlug(db, userId, title)
  const fileKey = `${userId}/${slug}/file.${isPdf ? 'pdf' : 'md'}`
  await r2.put(fileKey, body, { httpMetadata })

  let cover_path: string | null = null
  if (cover && cover.size > 0) {
    cover_path = `${userId}/${slug}/cover.${cover.name.split('.').pop() ?? 'jpg'}`
    await r2.put(cover_path, cover.stream(), {
      httpMetadata: { contentType: cover.type || 'image/jpeg' },
    })
  } else if (coverUrl) {
    cover_path = await storeCoverFromUrl(r2, coverUrl)
  }

  await db.insert(books).values({
    id: crypto.randomUUID(),
    user_id: userId,
    slug,
    title,
    author,
    year: year ? parseInt(year) : null,
    phase: phase ? parseInt(phase) : null,
    content_type: isPdf ? 'pdf' : 'markdown',
    file_path: fileKey,
    cover_path,
    text_path: null,
    file_size_bytes: storedSize,
  })

  return c.json({ slug, title, author, content_type: isPdf ? 'pdf' : 'markdown' }, 201)
})

// GET /books/:slug
router.get('/:slug', requireAuth, async (c) => {
  const slug = c.req.param('slug') ?? ''
  const book = await ownedBook(getDb(c.env), c.get('userId'), slug)
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
    cover_url: coverUrlFor(slug, book.cover_path),
    has_text: Boolean(book.text_path),
  })
})

// GET /books/:slug/pdf
router.get('/:slug/pdf', requireAuth, async (c) => {
  const slug = c.req.param('slug') ?? ''
  const book = await ownedBook(getDb(c.env), c.get('userId'), slug)
  if (!book || book.content_type !== 'pdf') return c.json({ error: 'not found' }, 404)

  const obj = await c.env.BOOKS.get(book.file_path)
  if (!obj) return c.json({ error: 'file not found in storage' }, 404)

  return new Response(await gunzipIfNeeded(await obj.arrayBuffer()), {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' },
  })
})

// GET /books/:slug/cover
router.get('/:slug/cover', requireAuth, async (c) => {
  const slug = c.req.param('slug') ?? ''
  const book = await ownedBook(getDb(c.env), c.get('userId'), slug)
  if (!book?.cover_path) return c.json({ error: 'no cover' }, 404)

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
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''
  const book = await ownedBook(getDb(c.env), userId, slug)

  if (!book) return c.json({ error: 'not found' }, 404)
  if (!book.text_path) return c.json({ error: 'text not extracted yet' }, 404)

  const page = parseInt(c.req.query('page') ?? '1')
  const obj = await c.env.BOOKS.get(`${userId}/${slug}/text/page-${page}.json`)
  if (!obj) return c.json({ error: 'page not found', pages: 0 }, 404)

  return c.json(await obj.json())
})

// POST /books/:slug/extract-text — the Worker has no PDF parser; the viewer extracts client-side
router.post('/:slug/extract-text', requireAuth, (c) =>
  c.json({ error: 'Text extraction is not available in this environment. Use the PDF viewer directly.' }, 501))

// POST /books/:slug/fetch-cover — client resolves the URL, worker stores it in R2
router.post('/:slug/fetch-cover', requireAuth, async (c) => {
  const db = getDb(c.env)
  const slug = c.req.param('slug') ?? ''
  const book = await ownedBook(db, c.get('userId'), slug)

  if (!book) return c.json({ error: 'not found' }, 404)
  if (book.cover_path) return c.json({ cover_url: coverUrlFor(slug, book.cover_path) })

  const { cover_url } = await c.req.json<{ cover_url?: string }>().catch(() => ({ cover_url: undefined }))
  if (!cover_url) return c.json({ cover_url: null })

  const cover_path = await storeCoverFromUrl(c.env.BOOKS, cover_url)
  if (!cover_path) return c.json({ cover_url: null })

  await db.update(books).set({ cover_path }).where(eq(books.id, book.id))
  return c.json({ cover_url: coverUrlFor(slug, cover_path) })
})

// DELETE /books/:slug
router.delete('/:slug', requireAuth, async (c) => {
  const db = getDb(c.env)
  const book = await ownedBook(db, c.get('userId'), c.req.param('slug') ?? '')
  if (!book) return c.json({ error: 'not found' }, 404)

  await deleteBookObjects(c.env.BOOKS, book)
  await db.delete(books).where(eq(books.id, book.id))

  return c.json({ ok: true })
})

export default router

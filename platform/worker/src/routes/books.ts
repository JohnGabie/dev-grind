import { Hono } from 'hono'
import { eq, desc, and, count, sum, asc } from 'drizzle-orm'
import { getDb } from '../db'
import { books, userInventory, storeItems } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const MAX_PDF_BYTES     = 20 * 1024 * 1024        // 20 MB per file
const MAX_PDFS_PER_USER = 4
const R2_LIMIT_BYTES    = 10 * 1024 * 1024 * 1024 // 10 GB global bucket limit
const R2_EVICT_THRESHOLD = R2_LIMIT_BYTES * 0.90  // start evicting at 90%

async function sha256Short(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

async function gzipBuffer(data: ArrayBuffer): Promise<ArrayBuffer> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(data)
  writer.close()
  return new Response(cs.readable).arrayBuffer()
}

async function getPdfSlotLimit(db: ReturnType<typeof getDb>, userId: string): Promise<number> {
  const [{ value: extra }] = await db
    .select({ value: count() })
    .from(userInventory)
    .innerJoin(storeItems, eq(userInventory.item_id, storeItems.id))
    .where(and(eq(userInventory.user_id, userId), eq(storeItems.type, 'book_slot')))
  return 4 + Math.min(Number(extra ?? 0), 4)
}

// GET /books
router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')

  const [rows, slotLimit] = await Promise.all([
    db.select().from(books).where(eq(books.user_id, userId)).orderBy(desc(books.created_at)),
    getPdfSlotLimit(db, userId),
  ])

  return c.json({
    slot_limit: slotLimit,
    books: rows.map(b => ({
      slug: b.slug,
      title: b.title,
      author: b.author,
      year: b.year,
      phase: b.phase,
      available: true,
      progress: 0,
      cover_url: b.cover_path ? `/books/${b.slug}/cover` : null,
      content_type: b.content_type,
    })),
  })
})

// POST /books/upload
router.post('/upload', requireAuth, async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const r2 = c.env.BOOKS

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const cover = formData.get('cover') as File | null
  const coverUrl = (formData.get('cover_url') as string | null)?.trim() || null
  const title = (formData.get('title') as string | null)?.trim()
  const author = (formData.get('author') as string | null)?.trim()
  const year = formData.get('year') as string | null
  const phase = formData.get('phase') as string | null

  if (!file || !title || !author) {
    return c.json({ detail: 'file, title e author são obrigatórios' }, 400)
  }

  const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'md'
  const content_type = ext === 'pdf' ? 'pdf' : 'markdown'

  // Size limit (PDFs only)
  if (ext === 'pdf' && file.size > MAX_PDF_BYTES) {
    return c.json({ detail: `PDF muito grande. Máximo permitido: ${MAX_PDF_BYTES / 1024 / 1024}MB.` }, 413)
  }

  // Compress PDF now so we know the real stored size before any checks
  let fileData: ArrayBuffer | ReadableStream
  let storedSize = file.size
  let httpMeta: Record<string, string>

  if (ext === 'pdf') {
    const raw = await file.arrayBuffer()
    const compressed = await gzipBuffer(raw)
    fileData = compressed
    storedSize = compressed.byteLength
    httpMeta = { contentType: 'application/pdf', contentEncoding: 'gzip' }
  } else {
    fileData = file.stream()
    httpMeta = { contentType: 'text/markdown; charset=utf-8' }
  }

  // PDF count limit (dynamic based on store purchases)
  if (ext === 'pdf') {
    const [{ value: pdfCount }, slotLimit] = await Promise.all([
      db.select({ value: count() }).from(books)
        .where(and(eq(books.user_id, userId), eq(books.content_type, 'pdf')))
        .then(r => r[0]),
      getPdfSlotLimit(db, userId),
    ])

    if (Number(pdfCount) >= slotLimit) {
      return c.json({ detail: `Limite de ${slotLimit} PDFs atingido. Compre mais slots na loja.` }, 429)
    }
  }

  // R2 storage monitor — evict oldest PDF if approaching 10GB
  if (ext === 'pdf') {
    const [{ value: totalUsed }] = await db
      .select({ value: sum(books.file_size_bytes) })
      .from(books)

    const used = Number(totalUsed ?? 0)

    if (used + storedSize > R2_EVICT_THRESHOLD) {
      // Find oldest PDF across all users
      const [oldest] = await db
        .select()
        .from(books)
        .where(eq(books.content_type, 'pdf'))
        .orderBy(asc(books.created_at))
        .limit(1)

      if (oldest) {
        const keysToDelete = [oldest.file_path, oldest.cover_path, oldest.text_path].filter(Boolean) as string[]
        await Promise.all(keysToDelete.map(key => r2.delete(key)))
        await db.delete(books).where(eq(books.id, oldest.id))
      }
    }
  }

  // Unique slug
  let base = slugify(title)
  const existing = await db.select({ slug: books.slug }).from(books).where(eq(books.user_id, userId))
  const taken = new Set(existing.map(r => r.slug))
  let slug = base
  let i = 1
  while (taken.has(slug)) slug = `${base}-${i++}`

  // Upload to R2
  const fileKey = `${userId}/${slug}/file.${ext}`
  await r2.put(fileKey, fileData, { httpMetadata: httpMeta })

  // Upload cover to R2 — from uploaded file or remote URL
  let cover_path: string | null = null
  if (cover && cover.size > 0) {
    const coverExt = cover.name.split('.').pop() ?? 'jpg'
    const coverKey = `${userId}/${slug}/cover.${coverExt}`
    await r2.put(coverKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || 'image/jpeg' },
    })
    cover_path = coverKey
  } else if (coverUrl) {
    try {
      const hash = await sha256Short(coverUrl)
      // Check both extensions — reuse if already stored
      const existingJpg = await r2.head(`covers/${hash}.jpg`)
      const existingPng = !existingJpg ? await r2.head(`covers/${hash}.png`) : null
      if (existingJpg) {
        cover_path = `covers/${hash}.jpg`
      } else if (existingPng) {
        cover_path = `covers/${hash}.png`
      } else {
        const res = await fetch(coverUrl)
        if (res.ok) {
          const ct = res.headers.get('content-type') || 'image/jpeg'
          const ext = ct.includes('png') ? 'png' : 'jpg'
          const coverKey = `covers/${hash}.${ext}`
          await r2.put(coverKey, res.body!, { httpMetadata: { contentType: ct } })
          cover_path = coverKey
        }
      }
    } catch { /* skip cover if fetch fails */ }
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
    file_size_bytes: storedSize,
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

  const buf = await obj.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b

  let finalBuf: ArrayBuffer = buf
  if (isGzip) {
    const ds = new DecompressionStream('gzip')
    const writer = ds.writable.getWriter()
    await writer.write(bytes)
    await writer.close()
    finalBuf = await new Response(ds.readable).arrayBuffer()
  }

  return new Response(finalBuf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
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
router.post('/:slug/extract-text', requireAuth, async (c) => {
  return c.json({ error: 'Text extraction is not available in this environment. Use the PDF viewer directly.' }, 501)
})

// POST /books/:slug/fetch-cover — client sends a resolved cover URL; worker stores it in R2
router.post('/:slug/fetch-cover', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const slug = c.req.param('slug') ?? ''
  const r2 = c.env.BOOKS

  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId)))

  if (!book) return c.json({ error: 'not found' }, 404)
  if (book.cover_path) return c.json({ cover_url: `/books/${slug}/cover` })

  const body = await c.req.json<{ cover_url?: string }>().catch(() => ({}))
  const coverUrl = body.cover_url
  if (!coverUrl) return c.json({ cover_url: null })

  let cover_path: string | null = null
  try {
    const hash = await sha256Short(coverUrl)
    const existingJpg = await r2.head(`covers/${hash}.jpg`)
    const existingPng = !existingJpg ? await r2.head(`covers/${hash}.png`) : null
    if (existingJpg) {
      cover_path = `covers/${hash}.jpg`
    } else if (existingPng) {
      cover_path = `covers/${hash}.png`
    } else {
      const fetchRes = await fetch(coverUrl)
      if (fetchRes.ok) {
        const ct = fetchRes.headers.get('content-type') || 'image/jpeg'
        const ext = ct.includes('png') ? 'png' : 'jpg'
        const coverKey = `covers/${hash}.${ext}`
        await r2.put(coverKey, fetchRes.body!, { httpMetadata: { contentType: ct } })
        cover_path = coverKey
      }
    }
  } catch { /* skip on error */ }

  if (!cover_path) return c.json({ cover_url: null })

  await db.update(books).set({ cover_path }).where(eq(books.id, book.id))
  return c.json({ cover_url: `/books/${slug}/cover` })
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

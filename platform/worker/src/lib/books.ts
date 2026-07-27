/** Storage and quota rules for the book library. Routes stay thin on top of this. */
import { and, asc, count, eq, sum } from 'drizzle-orm'
import type { getDb } from '../db'
import { books, storeItems, userInventory } from '../db/schema'

export const MAX_PDF_BYTES = 20 * 1024 * 1024          // 20 MB per file
export const FREE_PDF_SLOTS = 4
export const MAX_EXTRA_SLOTS = 4
const R2_LIMIT_BYTES = 10 * 1024 * 1024 * 1024         // 10 GB bucket limit
const R2_EVICT_THRESHOLD = R2_LIMIT_BYTES * 0.9        // start evicting at 90%

type Db = ReturnType<typeof getDb>

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function sha256Short(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export async function gzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(data)
  writer.close()
  return new Response(cs.readable).arrayBuffer()
}

export async function gunzipIfNeeded(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buf)
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buf

  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  return new Response(ds.readable).arrayBuffer()
}

/** The single place that resolves "this user's book with this slug". */
export async function ownedBook(db: Db, userId: string, slug: string) {
  const [book] = await db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, userId))).limit(1)
  return book ?? null
}

export async function pdfSlotLimit(db: Db, userId: string): Promise<number> {
  const [{ value: extra }] = await db
    .select({ value: count() })
    .from(userInventory)
    .innerJoin(storeItems, eq(userInventory.item_id, storeItems.id))
    .where(and(eq(userInventory.user_id, userId), eq(storeItems.type, 'book_slot')))
  return FREE_PDF_SLOTS + Math.min(Number(extra ?? 0), MAX_EXTRA_SLOTS)
}

export async function pdfCount(db: Db, userId: string): Promise<number> {
  const [{ value }] = await db.select({ value: count() }).from(books)
    .where(and(eq(books.user_id, userId), eq(books.content_type, 'pdf')))
  return Number(value ?? 0)
}

export async function uniqueSlug(db: Db, userId: string, title: string): Promise<string> {
  const rows = await db.select({ slug: books.slug }).from(books).where(eq(books.user_id, userId))
  const taken = new Set(rows.map(r => r.slug))
  const base = slugify(title)
  let slug = base
  for (let i = 1; taken.has(slug); i++) slug = `${base}-${i}`
  return slug
}

/**
 * Covers fetched from a URL are content-addressed and shared across users, so the
 * same cover is stored once. Never delete these keys when a book is removed —
 * another book may point at the same hash.
 */
export function isSharedCover(key: string | null): boolean {
  return Boolean(key?.startsWith('covers/'))
}

export async function storeCoverFromUrl(r2: R2Bucket, url: string): Promise<string | null> {
  try {
    const hash = await sha256Short(url)
    for (const ext of ['jpg', 'png']) {
      if (await r2.head(`covers/${hash}.${ext}`)) return `covers/${hash}.${ext}`
    }

    const res = await fetch(url)
    if (!res.ok || !res.body) return null

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const key = `covers/${hash}.${contentType.includes('png') ? 'png' : 'jpg'}`
    await r2.put(key, res.body, { httpMetadata: { contentType } })
    return key
  } catch {
    return null
  }
}

/** Deletes a book's own R2 objects, leaving content-addressed covers in place. */
export async function deleteBookObjects(r2: R2Bucket, book: typeof books.$inferSelect) {
  const keys = [book.file_path, book.text_path]
  if (!isSharedCover(book.cover_path)) keys.push(book.cover_path)
  await Promise.all(keys.filter(Boolean).map(key => r2.delete(key as string)))
}

/** Frees space by dropping the oldest PDF once the bucket nears its limit. */
export async function evictIfNearLimit(db: Db, r2: R2Bucket, incomingBytes: number) {
  const [{ value: totalUsed }] = await db.select({ value: sum(books.file_size_bytes) }).from(books)
  if (Number(totalUsed ?? 0) + incomingBytes <= R2_EVICT_THRESHOLD) return

  const [oldest] = await db.select().from(books)
    .where(eq(books.content_type, 'pdf'))
    .orderBy(asc(books.created_at))
    .limit(1)
  if (!oldest) return

  await deleteBookObjects(r2, oldest)
  await db.delete(books).where(eq(books.id, oldest.id))
}

import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach } from 'vitest'
import { USER_ID, authed, jwtFor, resetDb, seedStoreItem, seedUser } from './helpers'
import { isSharedCover, slugify, uniqueSlug } from '../src/lib/books'
import { getDb } from '../src/db'

async function upload(fields: Record<string, string | Blob>, token?: string) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  return authed('/books/upload', { method: 'POST', body: form, token })
}

const md = (text = '# hello') => new File([text], 'book.md', { type: 'text/markdown' })

describe('books', () => {
  beforeEach(async () => {
    await resetDb()
    await seedUser()
  })

  it('rejects an upload missing required fields', async () => {
    expect((await upload({ file: md() })).status).toBe(400)
  })

  it('stores a markdown book and serves it back', async () => {
    const res = await upload({ file: md('# Capítulo 1'), title: 'Meu Livro', author: 'Autor' })
    expect(res.status).toBe(201)

    const detail = await authed('/books/meu-livro')
    const body = await detail.json<any>()
    expect(body.title).toBe('Meu Livro')
    expect(body.content).toBe('# Capítulo 1')
  })

  it('reports the default slot limit', async () => {
    const res = await authed('/books')
    expect((await res.json<any>()).slot_limit).toBe(4)
  })

  it('raises the slot limit after buying slots', async () => {
    await seedStoreItem('slot', 300, 'book_slot')
    await env.DB.prepare('INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)')
      .bind(USER_ID, 'slot').run()

    const res = await authed('/books')
    expect((await res.json<any>()).slot_limit).toBe(5)
  })

  it('hides books that belong to another user', async () => {
    await upload({ file: md(), title: 'Meu', author: 'A' })
    await seedUser('other', 'other@test.dev')

    const list = await authed('/books', { token: await jwtFor('other') })
    expect((await list.json<any>()).books).toEqual([])

    const detail = await authed('/books/meu', { token: await jwtFor('other') })
    expect(detail.status).toBe(404)
  })

  it('deletes a book and its stored file', async () => {
    await upload({ file: md(), title: 'Descartavel', author: 'A' })
    const key = `${USER_ID}/descartavel/file.md`
    expect(await env.BOOKS.head(key)).not.toBeNull()

    expect((await authed('/books/descartavel', { method: 'DELETE' })).status).toBe(200)
    expect(await env.BOOKS.head(key)).toBeNull()
  })

  it('keeps a shared cover when one book that uses it is deleted', async () => {
    await env.BOOKS.put('covers/abc123.jpg', 'image-bytes')
    for (const slug of ['livro-a', 'livro-b']) {
      await env.DB.prepare(`
        INSERT INTO books (id, user_id, slug, title, author, content_type, file_path, cover_path)
        VALUES (?, ?, ?, ?, 'A', 'pdf', ?, 'covers/abc123.jpg')
      `).bind(crypto.randomUUID(), USER_ID, slug, slug, `${USER_ID}/${slug}/file.pdf`).run()
    }

    await authed('/books/livro-a', { method: 'DELETE' })

    expect(await env.BOOKS.head('covers/abc123.jpg')).not.toBeNull()
    const stillThere = await authed('/books/livro-b/cover')
    expect(stillThere.status).toBe(200)
  })

  it('404s on text that was never extracted', async () => {
    await upload({ file: md(), title: 'Sem Texto', author: 'A' })
    expect((await authed('/books/sem-texto/text?page=1')).status).toBe(404)
  })
})

describe('book helpers', () => {
  it('slugifies accents and punctuation', () => {
    expect(slugify('Programação Avançada!')).toBe('programacao-avancada')
  })

  it('suffixes a slug that is already taken', async () => {
    await seedUser()
    await env.DB.prepare(`
      INSERT INTO books (id, user_id, slug, title, author, content_type, file_path)
      VALUES ('b1', ?, 'python', 'Python', 'A', 'pdf', 'p')
    `).bind(USER_ID).run()

    expect(await uniqueSlug(getDb(env), USER_ID, 'Python')).toBe('python-1')
  })

  it('only treats content-addressed keys as shared', () => {
    expect(isSharedCover('covers/abc.jpg')).toBe(true)
    expect(isSharedCover('user/slug/cover.jpg')).toBe(false)
    expect(isSharedCover(null)).toBe(false)
  })
})

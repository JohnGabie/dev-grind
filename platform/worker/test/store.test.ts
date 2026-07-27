import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach } from 'vitest'
import { USER_ID, authed, json, resetDb, seedStoreItem, seedUser } from './helpers'

async function setCoins(coins: number) {
  await env.DB.prepare('UPDATE users SET coins = ? WHERE id = ?').bind(coins, USER_ID).run()
}

async function coins(): Promise<number> {
  const row = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(USER_ID).first<{ coins: number }>()
  return row?.coins ?? 0
}

describe('store', () => {
  beforeEach(async () => {
    await resetDb()
    await seedUser()
    await seedStoreItem('bg-free', 0)
    await seedStoreItem('bg-paid', 500)
  })

  it('lists active items', async () => {
    const res = await authed('/store/items')
    expect(res.status).toBe(200)
    expect((await res.json<any[]>()).length).toBe(2)
  })

  it('buys an item the user can afford and debits the coins', async () => {
    await setCoins(500)

    const res = await authed('/store/buy/bg-paid', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await coins()).toBe(0)
  })

  it('refuses a purchase without enough coins', async () => {
    await setCoins(100)

    const res = await authed('/store/buy/bg-paid', { method: 'POST' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await coins()).toBe(100)
  })

  it('does not charge twice for the same item', async () => {
    await setCoins(1000)
    await authed('/store/buy/bg-paid', { method: 'POST' })
    await authed('/store/buy/bg-paid', { method: 'POST' })

    const rows = await env.DB.prepare(
      'SELECT count(*) AS n FROM user_inventory WHERE user_id = ? AND item_id = ?',
    ).bind(USER_ID, 'bg-paid').first<{ n: number }>()

    expect(rows?.n).toBe(1)
    expect(await coins()).toBe(500)
  })

  it('404s on an unknown item', async () => {
    expect((await authed('/store/buy/nope', { method: 'POST' })).status).toBe(404)
  })
})

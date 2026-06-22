import { Hono } from 'hono'
import { eq, and, isNotNull } from 'drizzle-orm'
import { getDb } from '../db'
import { users, storeItems, userInventory } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()
const VALID_SLOTS = new Set(['bg_dashboard', 'bg_profile', 'bg_kata'])

function itemDict(
  item: typeof storeItems.$inferSelect,
  owned: boolean,
  equippedSlots: string[],
) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    category: item.category,
    price_coins: item.price_coins,
    rarity: item.rarity,
    item_data: JSON.parse(item.item_data as string ?? '{}'),
    owned,
    equipped_slots: equippedSlots,
  }
}

// GET /store/items
router.get('/items', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')

  const items = await db.select().from(storeItems).where(eq(storeItems.is_active, true))
  const inv = await db.select().from(userInventory).where(eq(userInventory.user_id, userId))

  const ownedIds = new Set(inv.map(e => e.item_id))
  const slotMap = new Map(inv.filter(e => e.equipped_slot).map(e => [e.equipped_slot!, e.item_id]))

  return c.json(items.map(item => {
    const equippedSlots = [...slotMap.entries()].filter(([, iid]) => iid === item.id).map(([slot]) => slot)
    return itemDict(item, ownedIds.has(item.id), equippedSlots)
  }))
})

// POST /store/buy/:item_id
router.post('/buy/:item_id', requireAuth, async (c) => {
  const itemId = c.req.param('item_id')
  const db = getDb(c.env)
  const userId = c.get('userId')

  const [item] = await db.select().from(storeItems).where(eq(storeItems.id, itemId)).limit(1)
  if (!item) return c.json({ detail: 'Item não encontrado' }, 404)

  const [alreadyOwned] = await db.select({ id: userInventory.id })
    .from(userInventory)
    .where(and(eq(userInventory.user_id, userId), eq(userInventory.item_id, itemId)))
    .limit(1)
  if (alreadyOwned) return c.json({ detail: 'Item já adquirido' }, 400)

  const [user] = await db.select({ coins: users.coins }).from(users).where(eq(users.id, userId)).limit(1)
  if (user.coins < item.price_coins) return c.json({ detail: 'Coins insuficientes' }, 400)

  const newCoins = user.coins - item.price_coins
  await db.update(users).set({ coins: newCoins }).where(eq(users.id, userId))
  await db.insert(userInventory).values({ user_id: userId, item_id: itemId })

  return c.json({ ok: true, coins: newCoins })
})

// POST /store/equip/:item_id?slot=bg_dashboard
router.post('/equip/:item_id', requireAuth, async (c) => {
  const itemId = c.req.param('item_id')
  const slot = c.req.query('slot')
  if (!slot || !VALID_SLOTS.has(slot)) {
    return c.json({ detail: `Slot inválido. Use: ${[...VALID_SLOTS].join(', ')}` }, 400)
  }

  const db = getDb(c.env)
  const userId = c.get('userId')

  const [entry] = await db.select()
    .from(userInventory)
    .where(and(eq(userInventory.user_id, userId), eq(userInventory.item_id, itemId)))
    .limit(1)
  if (!entry) return c.json({ detail: 'Item não está no inventário' }, 403)

  // Unequip current item in this slot
  await db.update(userInventory)
    .set({ equipped_slot: null })
    .where(and(eq(userInventory.user_id, userId), eq(userInventory.equipped_slot, slot)))

  await db.update(userInventory)
    .set({ equipped_slot: slot })
    .where(and(eq(userInventory.user_id, userId), eq(userInventory.item_id, itemId)))

  return c.json({ ok: true })
})

// POST /store/unequip?slot=bg_dashboard
router.post('/unequip', requireAuth, async (c) => {
  const slot = c.req.query('slot')
  if (!slot || !VALID_SLOTS.has(slot)) {
    return c.json({ detail: `Slot inválido. Use: ${[...VALID_SLOTS].join(', ')}` }, 400)
  }
  const db = getDb(c.env)
  await db.update(userInventory)
    .set({ equipped_slot: null })
    .where(and(eq(userInventory.user_id, c.get('userId')), eq(userInventory.equipped_slot, slot)))

  return c.json({ ok: true })
})

// GET /store/equipped
router.get('/equipped', requireAuth, async (c) => {
  const db = getDb(c.env)
  const inv = await db.select()
    .from(userInventory)
    .where(and(eq(userInventory.user_id, c.get('userId')), isNotNull(userInventory.equipped_slot)))

  const result: Record<string, unknown> = {}
  for (const entry of inv) {
    const [item] = await db.select().from(storeItems).where(eq(storeItems.id, entry.item_id)).limit(1)
    if (item) result[entry.equipped_slot!] = JSON.parse(item.item_data as string ?? '{}')
  }
  return c.json(result)
})

// GET /store/inventory
router.get('/inventory', requireAuth, async (c) => {
  const db = getDb(c.env)
  const inv = await db.select()
    .from(userInventory)
    .where(eq(userInventory.user_id, c.get('userId')))

  const result = []
  for (const entry of inv) {
    const [item] = await db.select().from(storeItems).where(eq(storeItems.id, entry.item_id)).limit(1)
    if (item) result.push({
      item_id: entry.item_id,
      name: item.name,
      type: item.type,
      item_data: JSON.parse(item.item_data as string ?? '{}'),
      equipped_slot: entry.equipped_slot,
      purchased_at: entry.purchased_at,
    })
  }
  return c.json(result)
})

export default router

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BADGES, isUnlocked, type BadgeStats } from './badges.ts'

const ZERO: BadgeStats = { total_completed: 0, current_streak: 0, days_active: 0, honor: 0, total_attempted: 0, completion_rate: 0 }
const unlocked = (stats: BadgeStats) => BADGES.filter(b => isUnlocked(b, stats)).map(b => b.id)

describe('badges', () => {
  it('unlocks nothing for a new account', () => {
    assert.deepEqual(unlocked(ZERO), [])
  })
  it('unlocks the first-step and honor badges by threshold', () => {
    assert.deepEqual(unlocked({ ...ZERO, total_completed: 1 }), ['first'])
    assert.deepEqual(unlocked({ ...ZERO, honor: 120 }), ['honor30', 'honor120'])
  })
  it('requires both attempts and accuracy for the sharpshooter badge', () => {
    assert.equal(unlocked({ ...ZERO, total_attempted: 5, completion_rate: 0.79 }).includes('sharpshooter'), false)
    assert.equal(unlocked({ ...ZERO, total_attempted: 5, completion_rate: 0.8 }).includes('sharpshooter'), true)
  })
  it('keeps eight definitions with unique ids', () => {
    assert.equal(BADGES.length, 8)
    assert.equal(new Set(BADGES.map(b => b.id)).size, 8)
  })
})

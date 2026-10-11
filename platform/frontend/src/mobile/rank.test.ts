import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { honorMissing, nextRank, progressPercent, rankColor } from './rank.ts'

describe('rank', () => {
  it('maps a rank to its colour and falls back for unknown ranks', () => {
    assert.equal(rankColor('8kyu'), '#9b9b9b')
    assert.equal(rankColor('1kyu'), '#a855f7')
    assert.equal(rankColor('banana'), '#525252')
  })
  it('finds the next rank and stops at 1kyu', () => {
    assert.equal(nextRank('8kyu'), '7kyu')
    assert.equal(nextRank('2kyu'), '1kyu')
    assert.equal(nextRank('1kyu'), null)
    assert.equal(nextRank('???'), null)
  })
  it('never reports negative missing honor', () => {
    assert.equal(honorMissing(84, 120), 36)
    assert.equal(honorMissing(130, 120), 0)
  })
  it('clamps and rounds progress to 0-100', () => {
    assert.equal(progressPercent(0.624), 62)
    assert.equal(progressPercent(1.4), 100)
    assert.equal(progressPercent(-1), 0)
    assert.equal(progressPercent(Number.NaN), 0)
  })
})

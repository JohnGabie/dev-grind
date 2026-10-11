import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isInsightNew } from './insightSeen.ts'

describe('isInsightNew', () => {
  it('is new when it was never opened or the marker is invalid', () => {
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', null), true)
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', 'not a date'), true)
  })
  it('is new only when generated after the last open', () => {
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', '2026-10-09T10:00:00Z'), true)
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', '2026-10-11T10:00:00Z'), false)
  })
  it('is never new when its own date is invalid', () => {
    assert.equal(isInsightNew('???', null), false)
  })
})

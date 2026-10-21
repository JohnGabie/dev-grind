import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STATE_COLOR, percentOf } from './courseDisplay.ts'

describe('percentOf', () => {
  it('is 0 when there are no lessons', () => assert.equal(percentOf(0, 0), 0))
  it('rounds to whole percents', () => {
    assert.equal(percentOf(1, 2), 50)
    assert.equal(percentOf(2, 3), 67)
    assert.equal(percentOf(3, 3), 100)
  })
})

describe('STATE_COLOR', () => {
  it('has a colour for each state', () => {
    assert.deepEqual(Object.keys(STATE_COLOR).sort(), ['concluído', 'em andamento', 'não iniciado'].sort())
  })
})

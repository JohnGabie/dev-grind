import test from 'node:test'
import assert from 'node:assert/strict'
import { totalVisualLines, visualLineCounts } from './visualLines.ts'

test('rows are counted by rendered height over line height', () => {
  assert.deepEqual(visualLineCounts([20, 60, 100], 20), [1, 3, 5])
  assert.equal(totalVisualLines([1, 5]), 6)
})

test('unmeasurable rows fall back to one line each', () => {
  assert.deepEqual(visualLineCounts([0, 40], 0), [1, 1])
  assert.deepEqual(visualLineCounts([0, 40], 20), [1, 2])
  assert.deepEqual(visualLineCounts([], 20), [])
})

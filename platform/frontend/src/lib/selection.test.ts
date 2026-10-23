import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleSelection, retainFailed } from './selection.ts'

test('toggling an unselected id selects it', () => {
  assert.deepEqual([...toggleSelection(new Set(['a']), 'b')], ['a', 'b'])
})

test('toggling a selected id clears it', () => {
  assert.deepEqual([...toggleSelection(new Set(['a', 'b']), 'a')], ['b'])
})

test('toggling returns a new set and leaves the input untouched', () => {
  const before = new Set(['a'])
  const after = toggleSelection(before, 'b')
  assert.notEqual(after, before)
  assert.deepEqual([...before], ['a'])
})

test('only selected ids that failed stay selected', () => {
  assert.deepEqual([...retainFailed(new Set(['a', 'b', 'c']), ['b', 'x'])], ['b'])
})

test('nothing stays selected when nothing failed', () => {
  assert.equal(retainFailed(new Set(['a', 'b']), []).size, 0)
})

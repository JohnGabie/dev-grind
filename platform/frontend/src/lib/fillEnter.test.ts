import test from 'node:test'
import assert from 'node:assert/strict'
import { enterInBlank, enterKeyHintFor } from './fillEnter.ts'

test('Enter in the first of two empty blanks moves to the second', () => {
  assert.deepEqual(enterInBlank(['soma', ''], 0), { kind: 'focus', index: 1 })
})

test('Enter in the last blank verifies', () => {
  assert.deepEqual(enterInBlank(['soma', 'return'], 1), { kind: 'verify' })
})

test('Enter in the last blank verifies even when an earlier blank is empty', () => {
  assert.deepEqual(enterInBlank(['', 'return'], 1), { kind: 'verify' })
})

test('Enter skips filled blanks and moves to the next empty one', () => {
  assert.deepEqual(enterInBlank(['a', 'b', '', ''], 0), { kind: 'focus', index: 2 })
})

test('Enter verifies when every blank after this one is filled', () => {
  assert.deepEqual(enterInBlank(['a', 'b', 'c'], 0), { kind: 'verify' })
})

test('a single blank verifies', () => {
  assert.deepEqual(enterInBlank([''], 0), { kind: 'verify' })
})

test('the Enter key shows next when Enter moves, go when it verifies', () => {
  assert.equal(enterKeyHintFor(['soma', ''], 0), 'next')
  assert.equal(enterKeyHintFor(['soma', ''], 1), 'go')
})

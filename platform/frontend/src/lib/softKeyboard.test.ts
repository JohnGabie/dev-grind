import test from 'node:test'
import assert from 'node:assert/strict'
import { KEYBOARD_MIN_DROP, keyboardHeight, nextBaseline } from './softKeyboard.ts'

test('the first reading becomes the baseline', () => {
  assert.deepEqual(nextBaseline(null, 411, 769), { width: 411, height: 769 })
})

test('a taller reading at the same width raises the baseline', () => {
  assert.deepEqual(nextBaseline({ width: 411, height: 705 }, 411, 769), { width: 411, height: 769 })
})

test('a shorter reading at the same width keeps the baseline (the keyboard opened)', () => {
  assert.deepEqual(nextBaseline({ width: 411, height: 769 }, 411, 479), { width: 411, height: 769 })
})

test('a new width (rotation) starts a new baseline', () => {
  assert.deepEqual(nextBaseline({ width: 411, height: 769 }, 914, 340), { width: 914, height: 340 })
})

test('the Gboard keyboard on the moto g41 (769 -> 479) is open with its height', () => {
  assert.equal(keyboardHeight({ width: 411, height: 769 }, 479), 290)
})

test('the Firefox toolbar (64 px) is not a keyboard', () => {
  assert.equal(keyboardHeight({ width: 411, height: 769 }, 705), 0)
})

test('a drop of exactly the minimum is a keyboard', () => {
  assert.equal(keyboardHeight({ width: 411, height: 769 }, 769 - KEYBOARD_MIN_DROP), KEYBOARD_MIN_DROP)
})

test('no baseline means no keyboard', () => {
  assert.equal(keyboardHeight(null, 479), 0)
})

test('fractional heights round to whole pixels', () => {
  assert.equal(keyboardHeight({ width: 411, height: 769 }, 478.8), 290)
})

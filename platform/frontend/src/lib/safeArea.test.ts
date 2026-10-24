import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectiveBottomInset, SAFE_BOTTOM } from './safeArea.ts'

test('Firefox for Android: the nav bar sits below the viewport, so the inset drops to 0', () => {
  assert.equal(effectiveBottomInset({ inset: 48.3, screenHeight: 920, viewportTop: 102.7333, viewportHeight: 769 }), 0)
})

test('Firefox drawing to the bottom edge keeps the whole inset', () => {
  assert.equal(effectiveBottomInset({ inset: 48.3, screenHeight: 920, viewportTop: 102.7, viewportHeight: 817.3 }), 48.3)
})

test('a viewport that covers part of the inset keeps only that part', () => {
  assert.equal(effectiveBottomInset({ inset: 48, screenHeight: 920, viewportTop: 100, viewportHeight: 800 }), 28)
})

test('with the keyboard open the inset is 0 and stays 0', () => {
  assert.equal(effectiveBottomInset({ inset: 0, screenHeight: 920, viewportTop: 102.7, viewportHeight: 479 }), 0)
})

test('a browser without a viewport position on screen keeps the inset (iOS Safari)', () => {
  assert.equal(effectiveBottomInset({ inset: 34, screenHeight: 844, viewportTop: undefined, viewportHeight: 664 }), 34)
})

test('pages read the bottom inset through the corrected variable with env() as fallback', () => {
  assert.equal(SAFE_BOTTOM, 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))')
})

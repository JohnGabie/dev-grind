import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pagePadding, MOBILE_NAV_SPACE } from './layout.ts'

test('default still reserves the dock on mobile', () => {
  assert.ok(pagePadding('14px 48px 14px', true).includes(MOBILE_NAV_SPACE))
})

test('reserveDock false drops the nav space on mobile', () => {
  const p = pagePadding('14px 48px 14px', true, false, false)
  assert.ok(!p.includes(MOBILE_NAV_SPACE))
  assert.equal(p, '14px 20px calc(14px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))')
})

test('desktop ignores reserveDock', () => {
  assert.equal(pagePadding('14px 48px 14px', false, false, false), '14px 48px 14px')
})

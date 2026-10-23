import test from 'node:test'
import assert from 'node:assert/strict'
import { tabFromParam } from './courseTab.ts'

test('reads the roadmaps tab from the query value', () => {
  assert.equal(tabFromParam('roadmaps'), 'roadmaps')
})

test('no value or an unknown value means Cursos', () => {
  assert.equal(tabFromParam(null), 'cursos')
  assert.equal(tabFromParam(''), 'cursos')
  assert.equal(tabFromParam('Roadmaps'), 'cursos')
  assert.equal(tabFromParam('x'), 'cursos')
})

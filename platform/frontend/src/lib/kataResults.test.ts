import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeResults, hiddenCasesNote } from './kataResults.ts'

test('no run yet is not a pass', () => {
  assert.deepEqual(summarizeResults(null), { passedCount: 0, totalCount: 0, allPassed: false })
})

test('every case passing is a pass', () => {
  assert.deepEqual(
    summarizeResults([{ passed: true }, { passed: true }]),
    { passedCount: 2, totalCount: 2, allPassed: true },
  )
})

test('one failing case is not a pass', () => {
  assert.deepEqual(
    summarizeResults([{ passed: true }, { passed: false }]),
    { passedCount: 1, totalCount: 2, allPassed: false },
  )
})

test('an empty suite counts as a pass, as handleSubmit always did', () => {
  assert.deepEqual(summarizeResults([]), { passedCount: 0, totalCount: 0, allPassed: true })
})

test('one hidden case is singular', () => {
  assert.equal(hiddenCasesNote(1, 'no envio'), '+ 1 caso oculto — revelados no envio')
})

test('several hidden cases are plural', () => {
  assert.equal(hiddenCasesNote(3, 'ao verificar'), '+ 3 casos ocultos — revelados ao verificar')
})

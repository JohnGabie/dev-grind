import test from 'node:test'
import assert from 'node:assert/strict'
import { bulkDelete } from './bulkDelete.ts'

const httpError = (status: number) => ({ response: { status } })

test('every id is deleted when all calls succeed', async () => {
  const result = await bulkDelete(['a', 'b', 'c'], async () => {})
  assert.deepEqual(result, { deleted: ['a', 'b', 'c'], failed: [] })
})

test('a failure is reported and the remaining ids still run', async () => {
  const called: string[] = []
  const result = await bulkDelete(['a', 'b', 'c'], async id => {
    called.push(id)
    if (id === 'b') throw httpError(500)
  })
  assert.deepEqual(called, ['a', 'b', 'c'])
  assert.deepEqual(result, { deleted: ['a', 'c'], failed: ['b'] })
})

test('a 404 counts as deleted', async () => {
  const result = await bulkDelete(['a', 'b'], async id => {
    if (id === 'a') throw httpError(404)
  })
  assert.deepEqual(result, { deleted: ['a', 'b'], failed: [] })
})

test('an error without an HTTP status counts as failed', async () => {
  const result = await bulkDelete(['a'], async () => { throw new Error('network') })
  assert.deepEqual(result, { deleted: [], failed: ['a'] })
})

test('an empty list calls nothing', async () => {
  let calls = 0
  const result = await bulkDelete([], async () => { calls += 1 })
  assert.equal(calls, 0)
  assert.deepEqual(result, { deleted: [], failed: [] })
})

test('calls run one at a time in the given order', async () => {
  const events: string[] = []
  await bulkDelete(['a', 'b', 'c'], async id => {
    events.push(`start ${id}`)
    await new Promise(resolve => setTimeout(resolve, 5))
    events.push(`end ${id}`)
  })
  assert.deepEqual(events, ['start a', 'end a', 'start b', 'end b', 'start c', 'end c'])
})

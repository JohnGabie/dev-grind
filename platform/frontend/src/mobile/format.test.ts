import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { promptUser, statusWord, timeAgo } from './format.ts'

const NOW = Date.parse('2026-10-11T12:00:00Z')

describe('format', () => {
  it('formats elapsed time compactly', () => {
    assert.equal(timeAgo('2026-10-11T11:59:00Z', NOW), 'agora')
    assert.equal(timeAgo('2026-10-11T09:00:00Z', NOW), '3h')
    assert.equal(timeAgo('2026-10-08T12:00:00Z', NOW), '3d')
  })
  it('never relabels a status', () => {
    assert.equal(statusWord('passed'), 'concluído')
    assert.equal(statusWord('failed'), 'falhou')
    assert.equal(statusWord('in_progress'), 'em progresso')
    assert.equal(statusWord('whatever'), 'whatever')
  })

  it('derives the shell user from the first name', () => {
    assert.equal(promptUser('João Gabie'), 'joao')
    assert.equal(promptUser(''), 'dev')
    assert.equal(promptUser('Ana-Maria'), 'anamaria')
    assert.equal(promptUser('ÁÉÍ'), 'aei')
    assert.equal(promptUser('  - !'), 'dev')
  })
})

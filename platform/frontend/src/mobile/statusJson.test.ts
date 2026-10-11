import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStatusLines } from './statusJson.ts'
import { rankColor } from './rank.ts'

const base = { rank: '8kyu', honor: 2, honor_for_next_rank: 30, rank_progress: 0.067, current_streak: 0, weekly: 3 }

test('buildStatusLines lists keys in order with colours', () => {
  const lines = buildStatusLines(base)
  assert.deepEqual(lines.map(l => l.key), ['rank', 'honor', 'proximo', 'faltam', 'progresso', 'streak', 'semana'])
  const by = (k: string) => lines.find(l => l.key === k)!
  assert.equal(by('proximo').value, '7kyu')
  assert.equal(by('faltam').value, 28)
  assert.equal(by('progresso').value, '7%')
  assert.equal(buildStatusLines({ ...base, rank_progress: 0.62 }).find(l => l.key === 'progresso')!.value, '62%')
  assert.equal(by('rank').color, rankColor('8kyu'))
  for (const l of lines.filter(x => x.key !== 'rank')) assert.equal(l.color, 'var(--text)', l.key)
  assert.equal(buildStatusLines({ ...base, current_streak: 3 }).find(l => l.key === 'streak')!.color, 'var(--text)')
})

test('top rank has no proximo or faltam', () => {
  const keys = buildStatusLines({ ...base, rank: '3kyu', honor: 4500, honor_for_next_rank: 4000 }).map(l => l.key)
  assert.ok(!keys.includes('proximo'))
  assert.ok(!keys.includes('faltam'))
})

test('only the last line has no comma', () => {
  const lines = buildStatusLines(base)
  assert.deepEqual(lines.map(l => l.comma), [true, true, true, true, true, true, false])
})

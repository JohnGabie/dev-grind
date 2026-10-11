import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeeks, describeDay, levelOf } from './heatmap.ts'

const TODAY = new Date(2026, 9, 11)   // Sunday 11 Oct 2026, local time

describe('buildWeeks', () => {
  it('returns the requested number of weeks of 7 slots and ends on today', () => {
    const weeks = buildWeeks({}, TODAY, 20)
    assert.equal(weeks.length, 20)
    for (const week of weeks) assert.equal(week.length, 7)
    const cells = weeks.flat().filter(c => c !== null)
    assert.equal(cells.filter(c => c.isToday).length, 1)
    assert.equal(cells[cells.length - 1].isToday, true)
  })
  it('is safe for an account with no activity at all', () => {
    const cells = buildWeeks({}, TODAY, 20).flat().filter(c => c !== null)
    assert.equal(cells.every(c => c.data.total === 0), true)
  })
  it('looks activity up by the cell date', () => {
    const today = buildWeeks({}, TODAY, 20).flat().filter(c => c !== null).find(c => c.isToday)!
    const weeks = buildWeeks({ [today.date]: { total: 3, katas: 2, books: 0, courses: 1 } }, TODAY, 20)
    const found = weeks.flat().filter(c => c !== null).find(c => c.isToday)!
    assert.equal(found.data.total, 3)
  })
  it('builds a full year when asked for 53 weeks', () => {
    assert.equal(buildWeeks({}, TODAY, 53).length, 53)
  })
})

describe('describeDay and levelOf', () => {
  it('says no activity for an empty day', () => {
    assert.match(describeDay('2026-10-07', { total: 0, katas: 0, books: 0, courses: 0 }), /sem atividade/)
  })
  it('pluralises katas, aulas and livros', () => {
    const text = describeDay('2026-10-07', { total: 5, katas: 2, books: 1, courses: 1 })
    assert.match(text, /2 katas/)
    assert.match(text, /1 aula\b/)
    assert.match(text, /1 livro\b/)
  })
  it('caps the colour level at 4', () => {
    assert.equal(levelOf(0), 0)
    assert.equal(levelOf(1), 1)
    assert.equal(levelOf(3), 3)
    assert.equal(levelOf(9), 4)
  })
})

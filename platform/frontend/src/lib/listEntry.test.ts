import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { courseEntry } from './listEntry.ts'

function course(done: number, total: number): Course {
  return {
    id: 'c1', title: 'Git', description: 'Basics', created_at: '2026-10-01 10:00:00',
    completed: Array.from({ length: done }, (_, i) => `0-${i}`),
    parts: {},
    sections: [{
      title: 'S',
      lessons: Array.from({ length: total }, (_, i) => ({ title: `L${i}`, description: '', optional: false, steps: [], sectionIndex: 0, lessonIndex: i })),
    }],
  }
}

describe('courseEntry', () => {
  it('2 of 4 lessons done is em andamento with the continuar action', () => {
    const entry = courseEntry(course(2, 4))
    assert.equal(entry.kind, 'course')
    assert.equal(entry.id, 'c1')
    assert.equal(entry.title, 'Git')
    assert.equal(entry.description, 'Basics')
    assert.equal(entry.created_at, '2026-10-01 10:00:00')
    assert.equal(entry.done, 2)
    assert.equal(entry.total, 4)
    assert.equal(entry.state, 'em andamento')
    assert.equal(entry.action, 'continuar')
    assert.equal(entry.detail, undefined)
  })
  it('untouched is começar and finished is revisar', () => {
    assert.equal(courseEntry(course(0, 3)).action, 'começar')
    assert.equal(courseEntry(course(3, 3)).action, 'revisar')
  })
  it('position passes through, and is absent by default', () => {
    assert.equal(courseEntry(course(0, 1), 3).position, 3)
    assert.equal(courseEntry(course(0, 1)).position, undefined)
  })
})

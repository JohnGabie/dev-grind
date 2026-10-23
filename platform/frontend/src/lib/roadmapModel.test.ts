import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { asRoadmap, roadmapCourses, roadmapEntry, roadmapProgress, roadmapTarget, type Roadmap } from './roadmapModel.ts'

function course(id: string, done: number, total: number, parts: Record<string, number> = {}): Course {
  return {
    id, title: id, description: null, created_at: '2026-10-01 10:00:00',
    completed: Array.from({ length: done }, (_, i) => `0-${i}`),
    parts,
    sections: [{
      title: 'S',
      lessons: Array.from({ length: total }, (_, i) => ({ title: `L${i}`, description: '', optional: false, steps: [], sectionIndex: 0, lessonIndex: i })),
    }],
  }
}

function roadmap(ids: string[]): Roadmap {
  return { id: 'r1', title: 'Backend', description: null, created_at: '2026-10-02 10:00:00', course_ids: ids }
}

function mapOf(...courses: Course[]) {
  return new Map(courses.map(item => [item.id, item]))
}

describe('asRoadmap', () => {
  it('accepts the worker row shape', () => {
    const row = { id: 'r1', title: 'Backend', description: 'x', created_at: '2026-10-02 10:00:00', course_ids: ['a', 'b'] }
    assert.deepEqual(asRoadmap(row), row)
  })
  it('rejects a missing id', () => {
    assert.equal(asRoadmap({ title: 'Backend', course_ids: [] }), null)
  })
  it('rejects a missing title', () => {
    assert.equal(asRoadmap({ id: 'r1', course_ids: [] }), null)
  })
  it('rejects a non-array course_ids', () => {
    assert.equal(asRoadmap({ id: 'r1', title: 'Backend', course_ids: 'a' }), null)
  })
  it('rejects a non-object row', () => {
    assert.equal(asRoadmap(null), null)
  })
})

describe('roadmapCourses', () => {
  it('returns existing members in order and skips missing ones', () => {
    const a = course('a', 0, 1)
    const b = course('b', 0, 1)
    assert.deepEqual(roadmapCourses(roadmap(['b', 'gone', 'a']), mapOf(a, b)), [b, a])
  })
})

describe('roadmapProgress', () => {
  it('sums two courses', () => {
    const result = roadmapProgress(roadmap(['a', 'b']), mapOf(course('a', 2, 4), course('b', 5, 5)))
    assert.deepEqual(result, { courses: 2, done: 7, total: 9, state: 'em andamento' })
  })
  it('skips a member that no longer exists', () => {
    const result = roadmapProgress(roadmap(['a', 'gone']), mapOf(course('a', 1, 4)))
    assert.equal(result.courses, 1)
    assert.equal(result.total, 4)
  })
  it('an empty roadmap is 0/0 não iniciado', () => {
    assert.deepEqual(roadmapProgress(roadmap([]), mapOf()), { courses: 0, done: 0, total: 0, state: 'não iniciado' })
  })
  it('a member made only of undone optional lessons keeps the roadmap em andamento', () => {
    const optionalOnly: Course = {
      id: 'opt', title: 'opt', description: null, completed: [], parts: {},
      sections: [{ title: 'S', lessons: [{ title: 'L0', description: '', optional: true, steps: [], sectionIndex: 0, lessonIndex: 0 }] }],
    }
    const result = roadmapProgress(roadmap(['a', 'opt']), mapOf(course('a', 2, 2), optionalOnly))
    assert.equal(result.state, 'em andamento')
    assert.deepEqual(roadmapTarget(roadmap(['a', 'opt']), mapOf(course('a', 2, 2), optionalOnly)), { courseId: 'opt', lessonKey: null })
  })
  it('all courses concluded is concluído', () => {
    const result = roadmapProgress(roadmap(['a', 'b']), mapOf(course('a', 3, 3), course('b', 2, 2)))
    assert.equal(result.state, 'concluído')
  })
  it('a member with only started parts makes it em andamento', () => {
    const result = roadmapProgress(roadmap(['a', 'b']), mapOf(course('a', 0, 3, { '0-0': 1 }), course('b', 0, 2)))
    assert.equal(result.done, 0)
    assert.equal(result.state, 'em andamento')
  })
  it('untouched courses are não iniciado', () => {
    assert.equal(roadmapProgress(roadmap(['a']), mapOf(course('a', 0, 3))).state, 'não iniciado')
  })
})

describe('roadmapTarget', () => {
  it('picks the first non-concluded member and its continue lesson', () => {
    const target = roadmapTarget(roadmap(['a', 'b', 'c']), mapOf(course('a', 3, 3), course('b', 1, 3), course('c', 0, 2)))
    assert.deepEqual(target, { courseId: 'b', lessonKey: '0-1' })
  })
  it('is null for an empty roadmap', () => {
    assert.equal(roadmapTarget(roadmap([]), mapOf()), null)
  })
  it('is null when every member is concluded', () => {
    assert.equal(roadmapTarget(roadmap(['a']), mapOf(course('a', 2, 2))), null)
  })
  it('skips missing members', () => {
    assert.deepEqual(roadmapTarget(roadmap(['gone', 'a']), mapOf(course('a', 0, 2))), { courseId: 'a', lessonKey: '0-0' })
  })
})

describe('roadmapEntry', () => {
  it('describes a single-course roadmap', () => {
    const entry = roadmapEntry(roadmap(['a']), mapOf(course('a', 0, 3)))
    assert.equal(entry.kind, 'roadmap')
    assert.equal(entry.id, 'r1')
    assert.equal(entry.title, 'Backend')
    assert.equal(entry.detail, '1 curso')
    assert.equal(entry.action, 'começar')
    assert.equal(entry.created_at, '2026-10-02 10:00:00')
  })
  it('uses the plural and continuar when in progress', () => {
    const entry = roadmapEntry(roadmap(['a', 'b', 'c']), mapOf(course('a', 1, 3), course('b', 0, 2), course('c', 0, 2)))
    assert.equal(entry.detail, '3 cursos')
    assert.equal(entry.action, 'continuar')
    assert.equal(entry.done, 1)
    assert.equal(entry.total, 7)
  })
  it('is revisar when concluded', () => {
    const entry = roadmapEntry(roadmap(['a']), mapOf(course('a', 2, 2)))
    assert.equal(entry.state, 'concluído')
    assert.equal(entry.action, 'revisar')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import type { Roadmap } from './roadmapModel.ts'
import { trailStages } from './roadmapTrail.ts'

function course(id: string, done: number, total: number): Course {
  return {
    id, title: `T-${id}`, description: null, created_at: '2026-10-01 10:00:00',
    completed: Array.from({ length: done }, (_, i) => `0-${i}`),
    parts: {},
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

describe('trailStages', () => {
  it('keeps the roadmap order and numbers the positions from 1', () => {
    const stages = trailStages(roadmap(['b', 'a']), mapOf(course('a', 0, 1), course('b', 0, 1)))
    assert.deepEqual(stages.map(stage => [stage.position, stage.id]), [[1, 'b'], [2, 'a']])
  })
  it('marks only the first stage that is not concluído as current', () => {
    const stages = trailStages(roadmap(['h', 'p', 'f']), mapOf(course('h', 5, 5), course('p', 2, 4), course('f', 0, 3)))
    assert.deepEqual(stages.map(stage => stage.current), [false, true, false])
    assert.deepEqual(stages.map(stage => stage.state), ['concluído', 'em andamento', 'não iniciado'])
  })
  it('does not mark a course with no required lesson as current', () => {
    const optionalOnly: Course = {
      id: 'opt', title: 'opt', description: null, created_at: '2026-10-01 10:00:00', completed: [], parts: {},
      sections: [{ title: 'S', lessons: [{ title: 'L0', description: '', optional: true, steps: [], sectionIndex: 0, lessonIndex: 0 }] }],
    }
    const stages = trailStages(roadmap(['opt', 'b']), mapOf(optionalOnly, course('b', 1, 3)))
    assert.deepEqual(stages.map(stage => stage.current), [false, true])
  })
  it('has no current stage when every stage is concluído', () => {
    const stages = trailStages(roadmap(['a', 'b']), mapOf(course('a', 2, 2), course('b', 1, 1)))
    assert.equal(stages.some(stage => stage.current), false)
  })
  it('rounds the percent', () => {
    const [stage] = trailStages(roadmap(['a']), mapOf(course('a', 1, 3)))
    assert.equal(stage.percent, 33)
    const [second] = trailStages(roadmap(['a']), mapOf(course('a', 2, 3)))
    assert.equal(second.percent, 67)
  })
  it('returns percent 0 when the course has no lessons', () => {
    const [stage] = trailStages(roadmap(['a']), mapOf(course('a', 0, 0)))
    assert.equal(stage.percent, 0)
    assert.equal(stage.total, 0)
  })
  it('skips a missing member and keeps the numbers contiguous', () => {
    const stages = trailStages(roadmap(['gone', 'a']), mapOf(course('a', 0, 2)))
    assert.deepEqual(stages.map(stage => [stage.position, stage.id]), [[1, 'a']])
  })
  it('carries the title, done and total of the course', () => {
    const [stage] = trailStages(roadmap(['a']), mapOf(course('a', 2, 4)))
    assert.deepEqual(stage, { id: 'a', position: 1, title: 'T-a', done: 2, total: 4, percent: 50, state: 'em andamento', current: true })
  })
})

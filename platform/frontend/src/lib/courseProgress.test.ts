import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { actionLabel, continueTarget, courseProgress, isInsideCourse, isInsideLesson, isOnSolvePage, lessonKeyOf, orderCourses } from './courseProgress.ts'

function makeCourse(id: string, lessons: { optional?: boolean; lessonIndex?: number }[], completed: string[], parts: Record<string, number> = {}): Course {
  return {
    id,
    title: id,
    description: null,
    completed,
    parts,
    sections: [{
      title: 'S',
      lessons: lessons.map((l, i) => ({
        title: `L${i}`, description: '', optional: l.optional === true, steps: [],
        sectionIndex: 0, lessonIndex: l.lessonIndex ?? i,
      })),
    }],
  }
}

const required = (n: number) => Array.from({ length: n }, () => ({}))
const keys = (n: number) => Array.from({ length: n }, (_, i) => `0-${i}`)

describe('courseProgress', () => {
  it('none done is não iniciado', () => {
    assert.deepEqual(courseProgress(makeCourse('html', required(5), [])), { done: 0, total: 5, state: 'não iniciado' })
  })
  it('some done is em andamento', () => {
    assert.deepEqual(courseProgress(makeCourse('py', required(4), keys(2))), { done: 2, total: 4, state: 'em andamento' })
  })
  it('all done is concluído', () => {
    assert.deepEqual(courseProgress(makeCourse('html', required(5), keys(5))), { done: 5, total: 5, state: 'concluído' })
  })
  it('an undone optional lesson is not counted', () => {
    const c = makeCourse('c', [{}, {}, { optional: true }], keys(2))
    assert.deepEqual(courseProgress(c), { done: 2, total: 2, state: 'concluído' })
  })
  it('a done optional lesson is counted', () => {
    const c = makeCourse('c', [{}, { optional: true }], keys(2))
    assert.deepEqual(courseProgress(c), { done: 2, total: 2, state: 'concluído' })
  })
  it('only undone optional lessons gives 0 de 0 and não iniciado', () => {
    assert.deepEqual(courseProgress(makeCourse('c', [{ optional: true }], [])), { done: 0, total: 0, state: 'não iniciado' })
  })
  it('ignores completed keys that no lesson has', () => {
    assert.deepEqual(courseProgress(makeCourse('c', required(2), ['0-0', '9-9'])), { done: 1, total: 2, state: 'em andamento' })
  })
  it('started parts without a finished lesson is em andamento', () => {
    assert.equal(courseProgress(makeCourse('c', required(2), [], { '0-0': 1 })).state, 'em andamento')
  })
})

describe('continueTarget', () => {
  it('is the first required lesson not completed', () => {
    assert.equal(continueTarget(makeCourse('py', required(4), keys(2))), '0-2')
  })
  it('is the first lesson when nothing is done', () => {
    assert.equal(continueTarget(makeCourse('html', required(5), [])), '0-0')
  })
  it('skips optional lessons', () => {
    assert.equal(continueTarget(makeCourse('c', [{}, { optional: true }, {}], ['0-0'])), '0-2')
  })
  it('uses the real key when a lesson index has a hole', () => {
    const c = makeCourse('c', [{ lessonIndex: 0 }, { lessonIndex: 2 }], ['0-0'])
    assert.equal(continueTarget(c), '0-2')
  })
  it('is null when every required lesson is done', () => {
    assert.equal(continueTarget(makeCourse('c', required(2), keys(2))), null)
  })
})

describe('orderCourses', () => {
  it('lists em andamento, then não iniciado, then concluído', () => {
    const list = [makeCourse('HTML', required(5), keys(5)), makeCourse('Git', required(3), []), makeCourse('Python', required(4), keys(2))]
    assert.deepEqual(orderCourses(list).map(c => c.id), ['Python', 'Git', 'HTML'])
  })
  it('keeps the input order inside a group and does not mutate', () => {
    const list = [makeCourse('A', required(2), []), makeCourse('B', required(2), []), makeCourse('C', required(2), [])]
    const before = list.map(c => c.id)
    assert.deepEqual(orderCourses(list).map(c => c.id), ['A', 'B', 'C'])
    assert.deepEqual(list.map(c => c.id), before)
  })
})

describe('actionLabel and helpers', () => {
  it('maps the state to the button word', () => {
    assert.equal(actionLabel('não iniciado'), 'começar')
    assert.equal(actionLabel('em andamento'), 'continuar')
    assert.equal(actionLabel('concluído'), 'revisar')
  })
  it('builds the lesson key from the raw indices', () => {
    assert.equal(lessonKeyOf({ sectionIndex: 1, lessonIndex: 3 }), '1-3')
  })
  it('knows when the path is inside a lesson', () => {
    assert.equal(isInsideLesson('/courses/abc/0-1'), true)
    assert.equal(isInsideLesson('/courses/abc'), false)
    assert.equal(isInsideLesson('/courses/abc/'), false)
    assert.equal(isInsideLesson('/courses'), false)
  })
  it('knows when the path is inside a course', () => {
    assert.equal(isInsideCourse('/courses/abc'), true)
    assert.equal(isInsideCourse('/courses/abc/0-1'), true)
    assert.equal(isInsideCourse('/courses'), false)
    assert.equal(isInsideCourse('/courses/'), false)
    assert.equal(isInsideCourse('/exercise/abc'), false)
  })
})

describe('isOnSolvePage', () => {
  it('is true only for the kata solve page', () => {
    assert.equal(isOnSolvePage('/exercise/saudacao/solve'), true)
    assert.equal(isOnSolvePage('/exercise/saudacao'), false)
    assert.equal(isOnSolvePage('/exercise'), false)
    assert.equal(isOnSolvePage('/courses/abc/0-1'), false)
  })
})

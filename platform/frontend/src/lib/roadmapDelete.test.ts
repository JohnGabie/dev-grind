import test from 'node:test'
import assert from 'node:assert/strict'
import { courseTitlesLine, deleteCoursesNotice, deleteRoadmapParams } from './roadmapDelete.ts'

test('the notice counts the courses that will be deleted', () => {
  assert.equal(deleteCoursesNotice(3), '3 cursos serão apagados com todo o progresso')
  assert.equal(deleteCoursesNotice(2), '2 cursos serão apagados com todo o progresso')
})

test('the notice uses the singular for one course', () => {
  assert.equal(deleteCoursesNotice(1), '1 curso será apagado com todo o progresso')
})

test('the notice is empty when no course exists', () => {
  assert.equal(deleteCoursesNotice(0), '')
})

test('delete_courses is sent only when the box is checked', () => {
  assert.deepEqual(deleteRoadmapParams(true), { delete_courses: true })
  assert.equal(deleteRoadmapParams(false), undefined)
})

test('the title list shows up to five titles and counts the rest', () => {
  assert.equal(courseTitlesLine(['A', 'B']), 'A, B')
  assert.equal(courseTitlesLine(['A', 'B', 'C', 'D', 'E']), 'A, B, C, D, E')
  assert.equal(courseTitlesLine(['A', 'B', 'C', 'D', 'E', 'F', 'G']), 'A, B, C, D, E e mais 2')
  assert.equal(courseTitlesLine([]), '')
})

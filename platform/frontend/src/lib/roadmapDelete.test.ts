import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteCoursesNotice, deleteRoadmapParams } from './roadmapDelete.ts'

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

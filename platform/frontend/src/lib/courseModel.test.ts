import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { asCourse, asStep } from './courseModel.ts'

describe('asCourse', () => {
  it('keeps a raw key when an earlier section is empty and an earlier step is unknown', () => {
    const course = asCourse({
      id: 'course-hole',
      title: 'Buraco',
      description: null,
      completed_lessons: [],
      modules: [
        { title: 'Vazia', lessons: [] },
        {
          title: 'Real',
          lessons: [
            { title: 'Some', steps: [{ type: 'desconhecido' }] },
            { title: 'Meio', steps: [{ type: 'text', body: 'ok' }] },
            { title: 'Fim', steps: [{ type: 'text', body: 'ok' }] },
          ],
        },
      ],
    })
    assert.equal(course?.sections.length, 1)
    assert.deepEqual(
      course?.sections[0].lessons.map(lesson => `${lesson.sectionIndex}-${lesson.lessonIndex}`),
      ['1-1', '1-2'],
    )
    assert.equal(course?.sections[0].lessons[0].optional, false)
    assert.equal(asStep({ type: 'kata', slug: 'saudacao-com-nome' }), null)
  })

  it('treats only boolean true as optional', () => {
    const course = asCourse({
      id: 'flags',
      title: 'Flags',
      modules: [{
        title: 'S',
        lessons: [
          { title: 'Ausente', steps: [{ type: 'text', body: 'a' }] },
          { title: 'Falso', optional: false, steps: [{ type: 'text', body: 'a' }] },
          { title: 'Um', optional: 1, steps: [{ type: 'text', body: 'a' }] },
          { title: 'Texto', optional: 'true', steps: [{ type: 'text', body: 'a' }] },
          { title: 'Extra', optional: true, steps: [{ type: 'text', body: 'a' }] },
        ],
      }],
      completed_lessons: ['0-4'],
    })
    assert.deepEqual(course?.sections[0].lessons.map(lesson => lesson.optional), [false, false, false, false, true])
    assert.deepEqual(course?.completed, ['0-4'])
    assert.equal(course?.sections[0].lessons.length, 5)
  })

  it('still parses a fill step', () => {
    const course = asCourse({
      id: 'fill',
      title: 'Fill',
      modules: [{
        title: 'S',
        lessons: [{
          title: 'L',
          steps: [{ type: 'fill', prompt: 'p', file: 'index.html', parts: [{ text: '<' }, { blank: 'a', size: 's' }], choices: ['a'] }],
        }],
      }],
      completed_lessons: [],
    })
    const step = course?.sections[0].lessons[0].steps[0]
    assert.equal(step?.type, 'fill')
    if (step?.type !== 'fill') return
    assert.equal(step.parts.length, 2)
    assert.deepEqual(step.choices, ['a'])
  })

  it('returns null when nothing can be drawn', () => {
    assert.equal(asCourse({ id: 'vazio', title: 'Vazio', modules: [] }), null)
    assert.equal(asCourse({ id: 'ruim', title: 'Ruim', modules: 'nope' }), null)
  })
})

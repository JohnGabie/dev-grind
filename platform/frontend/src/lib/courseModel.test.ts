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

  it('uses a written description, otherwise the first text step', () => {
    const course = asCourse({
      id: 'blurbs',
      title: 'Blurbs',
      modules: [{
        title: 'S',
        lessons: [
          { title: 'Escrita', description: '  direto  ', steps: [{ type: 'text', body: 'corpo' }] },
          { title: 'Corpo', steps: [{ type: 'text', body: '  primeiro  ' }, { type: 'text', body: 'segundo' }] },
          { title: 'Sem', steps: [{ type: 'fill', prompt: 'p', parts: [{ text: 'x' }], choices: [] }] },
          { title: 'Vazio', description: '   ', steps: [{ type: 'text', body: 'cai aqui' }] },
        ],
      }],
    })
    const lessons = course?.sections[0].lessons ?? []
    assert.equal(lessons[0].description, 'direto')
    assert.equal(lessons[1].description, 'primeiro')
    assert.equal(lessons[2].description, '')
    assert.equal(lessons[3].description, 'cai aqui')
  })

  it('keeps integer part counts', () => {
    const course = asCourse({
      id: 'parts',
      title: 'Parts',
      modules: [{ title: 'S', lessons: [{ title: 'A', steps: [{ type: 'text', body: 'a' }, { type: 'text', body: 'b' }] }] }],
      lesson_parts: { '0-0': 1, '0-9': 'nope' },
    })
    assert.deepEqual(course?.parts, { '0-0': 1 })
  })

  it('returns null when nothing can be drawn', () => {
    assert.equal(asCourse({ id: 'vazio', title: 'Vazio', modules: [] }), null)
    assert.equal(asCourse({ id: 'ruim', title: 'Ruim', modules: 'nope' }), null)
  })
})

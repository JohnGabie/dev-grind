import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { DEFAULT_PREFS, loadPrefs, matchesQuery, normalizeText, savePrefs, sortCourses, visibleCourses } from './courseView.ts'

function make(id: string, title: string, done: number, total: number, created_at?: string, description: string | null = null): Course {
  return {
    id, title, description, created_at,
    completed: Array.from({ length: done }, (_, i) => `0-${i}`),
    parts: {},
    sections: [{
      title: 'S',
      lessons: Array.from({ length: total }, (_, i) => ({ title: `L${i}`, description: '', optional: false, steps: [], sectionIndex: 0, lessonIndex: i })),
    }],
  }
}

const ids = (list: Course[]) => list.map(c => c.id)

describe('normalizeText and matchesQuery', () => {
  it('ignores case, accents and surrounding spaces', () => {
    assert.equal(normalizeText('  Introdução À Árvore '), 'introducao a arvore')
    assert.equal(matchesQuery({ title: 'Banco', description: 'Introdução a Banco de Dados' }, 'INTRODUCAO'), true)
  })
  it('matches title or description, not the join of both', () => {
    assert.equal(matchesQuery({ title: 'abc', description: 'def' }, 'c d'), false)
    assert.equal(matchesQuery({ title: 'abc', description: 'def' }, 'def'), true)
  })
  it('an empty or blank query matches everything', () => {
    assert.equal(matchesQuery({ title: 'x' }, ''), true)
    assert.equal(matchesQuery({ title: 'x' }, '   '), true)
  })
  it('treats regex characters literally', () => {
    assert.equal(matchesQuery({ title: 'C++ basics' }, 'c++'), true)
    assert.equal(matchesQuery({ title: 'abc' }, '('), false)
  })
})

describe('sortCourses', () => {
  const html = make('html', 'HTML', 5, 5, '2026-10-01 10:00:00')
  const git = make('git', 'Git', 0, 3, '2026-10-03 10:00:00')
  const py = make('py', 'Python', 2, 4, '2026-10-02 10:00:00')
  it('default is em andamento, não iniciado, concluído', () => {
    assert.deepEqual(ids(sortCourses([html, git, py], 'default')), ['py', 'git', 'html'])
  })
  it('recent is newest created first; missing dates go last', () => {
    const none = make('none', 'None', 0, 1)
    assert.deepEqual(ids(sortCourses([html, none, git, py], 'recent')), ['git', 'py', 'html', 'none'])
  })
  it('name is alphabetical, accent and case insensitive, numeric aware', () => {
    const a = make('a', 'água', 0, 1), b = make('b', 'Banco', 0, 1), c10 = make('c10', 'Curso 10', 0, 1), c2 = make('c2', 'Curso 2', 0, 1)
    assert.deepEqual(ids(sortCourses([c10, b, c2, a], 'name')), ['a', 'b', 'c2', 'c10'])
  })
  it('progress is highest percentage first, ties by title, total 0 is 0%', () => {
    const half = make('half', 'Zeta', 1, 2), half2 = make('half2', 'Alfa', 2, 4), empty = make('empty', 'Vazio', 0, 0), full = make('full', 'Cheio', 3, 3)
    assert.deepEqual(ids(sortCourses([empty, half, full, half2], 'progress')), ['full', 'half2', 'half', 'empty'])
  })
  it('keeps the input order for equal keys and does not mutate', () => {
    const list = [make('a', 'Same', 0, 1, '2026-10-01'), make('b', 'Same', 0, 1, '2026-10-01')]
    const before = ids(list)
    assert.deepEqual(ids(sortCourses(list, 'name')), ['a', 'b'])
    assert.deepEqual(ids(sortCourses(list, 'recent')), ['a', 'b'])
    assert.deepEqual(ids(list), before)
  })
})

describe('visibleCourses', () => {
  it('filters then sorts', () => {
    const list = [make('b', 'Backend', 0, 1), make('a', 'Algoritmos', 0, 1), make('p', 'Python', 0, 1)]
    assert.deepEqual(ids(visibleCourses(list, 'a', 'name')), ['a', 'b'])
  })
  it('a query with no match gives an empty list', () => {
    assert.deepEqual(visibleCourses([make('a', 'A', 0, 1)], 'zzzz', 'default'), [])
  })
})

describe('preferences', () => {
  const store = (initial: Record<string, string> = {}) => {
    const data = { ...initial }
    return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v } }
  }
  it('defaults when storage is empty or missing', () => {
    assert.deepEqual(loadPrefs(store()), DEFAULT_PREFS)
    assert.deepEqual(loadPrefs(null), DEFAULT_PREFS)
  })
  it('round-trips a saved choice', () => {
    const s = store()
    savePrefs(s, { view: 'lista', sort: 'name' })
    assert.deepEqual(loadPrefs(s), { view: 'lista', sort: 'name' })
  })
  it('falls back per field when a stored value is garbage', () => {
    const s = store({ 'devgrind.courses.view': 'banana', 'devgrind.courses.sort': 'progress' })
    assert.deepEqual(loadPrefs(s), { view: 'cards', sort: 'progress' })
  })
  it('never throws when storage throws', () => {
    const boom = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    assert.deepEqual(loadPrefs(boom), DEFAULT_PREFS)
    assert.doesNotThrow(() => savePrefs(boom, DEFAULT_PREFS))
  })
})

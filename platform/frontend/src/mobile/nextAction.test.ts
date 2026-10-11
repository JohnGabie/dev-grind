import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { distinctModeCount, pickModes, pickNextAction } from './nextAction.ts'

const ex = (slug: string, difficulty: string) => ({ slug, title: slug, difficulty })

describe('nextAction', () => {
  it('resumes an unfinished item', () => {
    const action = pickNextAction({ exercise: ex('a', '8kyu'), passed_count: 1, total_count: 3 }, [ex('b', '6kyu')])
    assert.equal(action?.kind, 'resume')
    assert.equal(action?.slug, 'a')
  })
  it('falls back to a new exercise when the resume is fully passed', () => {
    const action = pickNextAction({ exercise: ex('a', '8kyu'), passed_count: 3, total_count: 3 }, [ex('b', '6kyu')])
    assert.equal(action?.kind, 'start')
    assert.equal(action?.slug, 'b')
  })
  it('returns null when there is nothing to do', () => {
    assert.equal(pickNextAction(null, []), null)
  })
  it('starts with the hardest exercise for rank up', () => {
    const action = pickNextAction(null, [ex('easy', '8kyu'), ex('hard', '6kyu')])
    assert.equal(action?.slug, 'hard')
  })
  it('counts only distinct modes', () => {
    assert.equal(distinctModeCount([]), 0)
    assert.equal(distinctModeCount([ex('a', '8kyu')]), 1)
    assert.equal(distinctModeCount([ex('a', '8kyu'), ex('b', '6kyu')]), 2)
    assert.equal(pickModes([ex('a', '8kyu')]).practice?.slug, 'a')
  })
})

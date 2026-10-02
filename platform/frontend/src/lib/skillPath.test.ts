import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BRANCH,
  LANE_X,
  branchPlacement,
  connector,
  courseBranchSide,
  fnv1a,
  mainLanes,
  mainNodeY,
} from './skillPath.ts'

const HTML = 'f0eae0b5-5a5b-4d4b-9914-77d31ae3a49a'
const PYTHON = '7fb01e42-de75-44e1-ab31-c11a8fb9f2b5'

describe('mainLanes', () => {
  it('locks the HTML and Python courses', () => {
    assert.equal(fnv1a(`devgrind.skillpath.v1:${HTML}`), 906121739)
    assert.equal(fnv1a(`devgrind.skillpath.v1:${PYTHON}`), 2245293992)
    assert.deepEqual(mainLanes(HTML, 5), ['right', 'right', 'center', 'right', 'left'])
    assert.equal(mainLanes(HTML, 6)[5], 'center')
    assert.deepEqual(mainLanes(PYTHON, 4), ['left', 'center', 'left', 'center'])
    assert.equal(mainLanes(PYTHON, 5)[4], 'right')
    assert.deepEqual(mainLanes(HTML, 5), mainLanes(HTML, 6).slice(0, 5))
    assert.deepEqual(mainLanes(PYTHON, 4), mainLanes(PYTHON, 5).slice(0, 4))
    assert.deepEqual(mainLanes(HTML, 0), [])
    assert.equal(courseBranchSide(HTML), 1)
    assert.equal(courseBranchSide(PYTHON), -1)
  })
})

describe('geometry', () => {
  it('locks the HTML centers and the branch offsets', () => {
    assert.equal(mainNodeY(0, [0]), 64)
    assert.equal(mainNodeY(4, [0]), 576)
    assert.equal(mainNodeY(1, [0, 1]), 220)
    assert.equal(LANE_X.left, 48)
    assert.equal(LANE_X.center, 140)
    assert.equal(LANE_X.right, 232)
    assert.equal(connector(232, 64, 232, 192), 'M 232 64 C 232 128, 232 128, 232 192')
    assert.equal(connector(232, 192, 140, 320), 'M 232 192 C 232 256, 140 256, 140 320')
    assert.deepEqual(branchPlacement(232, 192, 0, 1), { x: 328, y: 192, side: 1, depth: 1 })
    assert.deepEqual(branchPlacement(232, 192, 1, 1), { x: 136, y: 192, side: -1, depth: 1 })
    assert.equal(branchPlacement(232, 192, 2, 1).x, 232 + 2 * BRANCH)
    assert.equal(branchPlacement(232, 192, 2, 1).side, 1)
    assert.equal(branchPlacement(232, 192, 2, 1).depth, 2)
    assert.equal(branchPlacement(232, 192, 3, 1).x, 232 - 2 * BRANCH)
  })
})

describe('frozen source', () => {
  it('does not call Math.random and keeps the freeze comment', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'skillPath.ts'), 'utf8')
    assert.equal(source.startsWith('// Frozen. Changing the salt, Step, or the constants moves every course map.\n'), true)
    assert.equal(source.includes('Math.random'), false)
  })
})

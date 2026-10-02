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
  placeSkillPath,
  type PathLesson,
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

const LONG = 'ABCDEFGHIJABCDEFGHIJABCDEFGHIJ'

function lesson(key: string, sectionIndex: number, sectionTitle: string, optional = false, title = key): PathLesson {
  return { key, title, optional, sectionIndex, sectionTitle }
}

const htmlFive: PathLesson[] = [
  lesson('0-0', 0, 'HTML básico', false, 'Tags'),
  lesson('0-1', 0, 'HTML básico', false, 'A página'),
  lesson('0-2', 0, 'HTML básico', false, 'Texto'),
  lesson('0-3', 0, 'HTML básico', false, 'Botão'),
  lesson('0-4', 0, 'HTML básico', false, 'Link'),
]

describe('placeSkillPath', () => {
  it('places the finished HTML course and keeps the prefix when a sixth required lesson is appended', () => {
    const done = ['0-0', '0-1', '0-2', '0-3', '0-4']
    const five = placeSkillPath(HTML, htmlFive, done)
    assert.deepEqual(five.nodes.map(node => [node.key, node.x, node.y, node.state]), [
      ['0-0', 232, 64, 'done'],
      ['0-1', 232, 192, 'done'],
      ['0-2', 140, 320, 'done'],
      ['0-3', 232, 448, 'done'],
      ['0-4', 48, 576, 'done'],
    ])
    assert.equal(five.nodes.some(node => node.state === 'current'), false)
    assert.equal(five.width, 280)
    assert.equal(five.minX, 0)
    assert.equal(five.height, 643)
    assert.equal(five.sectionTitles[0].text, 'HTML básico')
    assert.equal(five.sectionTitles[0].x, 140)
    assert.equal(five.sectionTitles[0].y, 14)
    assert.equal(five.sectionTitles[0].place, 'band')
    assert.equal(five.strokes[0].d, 'M 232 64 C 232 128, 232 128, 232 192')
    assert.equal(five.strokes[0].width, 10)
    assert.equal(five.strokes[1].d, 'M 232 192 C 232 256, 140 256, 140 320')

    const sixLessons = [...htmlFive, lesson('0-5', 0, 'HTML básico', false, 'Mais')]
    const six = placeSkillPath(HTML, sixLessons, done)
    assert.deepEqual(six.nodes.slice(0, 5).map(node => [node.x, node.y]), five.nodes.map(node => [node.x, node.y]))
    assert.deepEqual([six.nodes[5].x, six.nodes[5].y, six.nodes[5].state], [140, 704, 'current'])
  })

  it('puts the Python bolt on the first unfinished required lesson', () => {
    const lessons = [
      lesson('0-0', 0, 'Python básico', false, 'Valores'),
      lesson('0-1', 0, 'Python básico', false, 'Variável'),
      lesson('0-2', 0, 'Python básico', false, 'print'),
      lesson('0-3', 0, 'Python básico', false, 'if'),
    ]
    const map = placeSkillPath(PYTHON, lessons, ['0-0'])
    assert.deepEqual(map.nodes.map(node => [node.x, node.y, node.state]), [
      [48, 64, 'done'],
      [140, 192, 'current'],
      [48, 320, 'locked'],
      [140, 448, 'locked'],
    ])
  })

  it('keeps a later required lesson done when an earlier one is still the bolt', () => {
    const map = placeSkillPath(HTML, htmlFive, ['0-0', '0-2'])
    const byKey = new Map(map.nodes.map(node => [node.key, node.state]))
    assert.equal(byKey.get('0-0'), 'done')
    assert.equal(byKey.get('0-1'), 'current')
    assert.equal(byKey.get('0-2'), 'done')
    assert.equal(byKey.get('0-3'), 'locked')
  })

  it('does not move required nodes when an optional lesson is inserted', () => {
    const plain = placeSkillPath(HTML, htmlFive.slice(0, 3), [])
    const withOptional = placeSkillPath(HTML, [
      htmlFive[0],
      lesson('0-9', 0, 'HTML básico', true, 'Extra'),
      htmlFive[1],
      htmlFive[2],
    ], [])
    assert.deepEqual(
      withOptional.nodes.filter(node => !node.optional).map(node => [node.key, node.x, node.y]),
      plain.nodes.map(node => [node.key, node.x, node.y]),
    )
  })

  it('hangs three optionals off one anchor, alternating sides', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'HTML básico', false, 'Tags'),
      lesson('0-1', 0, 'HTML básico', true, 'Um'),
      lesson('0-2', 0, 'HTML básico', true, 'Dois'),
      lesson('0-3', 0, 'HTML básico', true, 'Três'),
    ], [])
    const branches = map.nodes.filter(node => node.optional)
    assert.deepEqual(branches.map(node => [node.x, node.y, node.state]), [
      [328, 64, 'optional-open'],
      [136, 64, 'optional-open'],
      [424, 64, 'optional-open'],
    ])
    assert.equal(map.strokes.find(stroke => stroke.width === 6)?.d, 'M 260 64 L 300 64')
    assert.equal(map.nodes[0].state, 'current')
  })

  it('opens optionals that sit before the first required lesson', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Antes', true, 'Antes'),
      lesson('1-0', 1, 'Real', false, 'Real'),
    ], [])
    assert.equal(map.nodes.find(node => node.key === '0-0')?.state, 'optional-open')
    assert.deepEqual(
      map.nodes.filter(node => node.optional).map(node => [node.x, node.y]),
      [[328, 64]],
    )
  })

  it('locks an optional whose anchor is not reached, and finishing it does not move the bolt', () => {
    // Extra is after B, so B is the anchor. B is locked, so Extra is locked. Completing only Extra leaves the bolt on A.
    const lessons = [
      lesson('0-0', 0, 'S', false, 'A'),
      lesson('0-1', 0, 'S', false, 'B'),
      lesson('0-2', 0, 'S', true, 'Extra'),
    ]
    const locked = placeSkillPath(HTML, lessons, [])
    assert.equal(locked.nodes.find(node => node.key === '0-2')?.state, 'optional-locked')
    const done = placeSkillPath(HTML, lessons, ['0-2'])
    assert.equal(done.nodes.find(node => node.key === '0-0')?.state, 'current')
    assert.equal(done.nodes.find(node => node.key === '0-2')?.state, 'optional-done')
    assert.equal(done.nodes.find(node => node.key === '0-1')?.state, 'locked')
  })

  it('lays an all-optional course in one row and does not use the 18px rule', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Primeira', true, 'Um'),
      lesson('1-0', 1, 'Segunda', true, 'Dois'),
    ], ['1-0'])
    assert.equal(map.strokes.length, 0)
    assert.equal(map.nodes.some(node => node.state === 'current'), false)
    assert.deepEqual(map.nodes.map(node => [node.x, node.y, node.state]), [
      [236, 92, 'optional-open'],
      [44, 92, 'optional-done'],
    ])
    assert.deepEqual(map.sectionTitles.map(title => [title.text, title.x, title.y, title.place]), [
      ['Primeira', 140, 14, 'band'],
      ['Segunda', 140, 42, 'band'],
    ])
  })

  it('puts a second required section title in the band above that section, at x 140', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Primeira', false, 'Um'),
      lesson('1-0', 1, 'Segunda', false, 'Dois'),
    ], [])
    assert.deepEqual(map.nodes.map(node => [node.x, node.y]), [[232, 64], [232, 220]])
    assert.deepEqual(map.sectionTitles.map(title => [title.x, title.y, title.place]), [[140, 14, 'band'], [140, 170, 'band']])
  })

  it('drops an overlapping optional-only section title below the opcional label', () => {
    const overlapped = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, LONG, true, 'Extra'),
    ], [])
    const title = overlapped.sectionTitles.find(item => item.place !== 'band')
    assert.deepEqual(title, { text: LONG, x: 328, y: 153, place: 'below' })

    const clear = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, 'A', true, 'Extra'),
    ], [])
    const above = clear.sectionTitles.find(item => item.text === 'A')
    assert.deepEqual(above, { text: 'A', x: 328, y: 2, place: 'above' })
  })

  it('lets a left branch extend the canvas past x 0', () => {
    const map = placeSkillPath(PYTHON, [
      lesson('0-0', 0, 'Python básico', false, 'Valores'),
      lesson('0-1', 0, 'Python básico', true, 'Extra'),
    ], ['0-0'])
    const extra = map.nodes.find(node => node.optional)
    assert.equal(extra?.x, -48)
    assert.equal(extra?.state, 'optional-open')
    assert.equal(map.minX, -76)
    assert.equal(map.strokes.find(stroke => stroke.width === 6)?.d, 'M 20 64 L -20 64')
  })
})

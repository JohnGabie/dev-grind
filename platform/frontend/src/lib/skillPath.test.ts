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
    assert.equal(mainNodeY(0, [0]), 96)
    assert.equal(mainNodeY(4, [0]), 864)
    assert.equal(mainNodeY(1, [0, 1]), 330)
    assert.equal(LANE_X.left, 72)
    assert.equal(LANE_X.center, 210)
    assert.equal(LANE_X.right, 348)
    assert.equal(connector(348, 96, 348, 288), 'M 348 96 L 348 288')
    assert.equal(connector(348, 288, 210, 480), 'M 348 288 L 348 360 Q 348 384 324 384 L 234 384 Q 210 384 210 408 L 210 480')
    assert.deepEqual(branchPlacement(348, 288, 0, 1), { x: 492, y: 288, side: 1, depth: 1 })
    assert.deepEqual(branchPlacement(348, 288, 1, 1), { x: 204, y: 288, side: -1, depth: 1 })
    assert.equal(branchPlacement(348, 288, 2, 1).x, 348 + 2 * BRANCH)
    assert.equal(branchPlacement(348, 288, 2, 1).side, 1)
    assert.equal(branchPlacement(348, 288, 2, 1).depth, 2)
    assert.equal(branchPlacement(348, 288, 3, 1).x, 348 - 2 * BRANCH)
  })
})

describe('frozen source', () => {
  it('does not call Math.random and keeps the freeze comment', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'skillPath.ts'), 'utf8').replace(/\r\n/g, '\n')
    assert.equal(source.startsWith('// Frozen. Changing the salt, Step, or the constants moves every course map.\n'), true)
    assert.equal(source.includes('Math.random'), false)
  })
})

const LONG = 'ABCDEFGHIJABCDEFGHIJABCDEFGHIJ'

function lesson(key: string, sectionIndex: number, sectionTitle: string, optional = false, title = key): PathLesson {
  return { key, title, description: '', optional, sectionIndex, sectionTitle }
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
      ['0-0', 348, 96, 'done'],
      ['0-1', 348, 288, 'done'],
      ['0-2', 210, 480, 'done'],
      ['0-3', 348, 672, 'done'],
      ['0-4', 72, 864, 'done'],
    ])
    assert.equal(five.nodes.some(node => node.state === 'current'), false)
    assert.equal(five.width, 918)
    assert.equal(five.minX, 0)
    assert.equal(five.height, 1034)
    assert.equal(five.sectionTitles[0].text, 'HTML básico')
    assert.equal(five.sectionTitles[0].x, 210)
    assert.equal(five.sectionTitles[0].y, 21)
    assert.equal(five.sectionTitles[0].place, 'band')
    assert.equal(five.strokes[0].d, 'M 348 96 L 348 288')
    assert.equal(five.strokes[0].width, 8)
    assert.equal(five.strokes[1].d, 'M 348 288 L 348 360 Q 348 384 324 384 L 234 384 Q 210 384 210 408 L 210 480')

    const sixLessons = [...htmlFive, lesson('0-5', 0, 'HTML básico', false, 'Mais')]
    const six = placeSkillPath(HTML, sixLessons, done)
    assert.deepEqual(six.nodes.slice(0, 5).map(node => [node.x, node.y]), five.nodes.map(node => [node.x, node.y]))
    assert.deepEqual([six.nodes[5].x, six.nodes[5].y, six.nodes[5].state], [210, 1056, 'current'])
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
      [72, 96, 'done'],
      [210, 288, 'current'],
      [72, 480, 'locked'],
      [210, 672, 'locked'],
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
      [492, 96, 'optional-open'],
      [204, 96, 'optional-open'],
      [636, 96, 'optional-open'],
    ])
    assert.equal(map.strokes.find(stroke => stroke.width === 5)?.d, 'M 390 96 L 450 96')
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
      [[492, 96]],
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
      [354, 138, 'optional-open'],
      [66, 138, 'optional-done'],
    ])
    assert.deepEqual(map.sectionTitles.map(title => [title.text, title.x, title.y, title.place]), [
      ['Primeira', 210, 21, 'band'],
      ['Segunda', 210, 63, 'band'],
    ])
  })

  it('puts a second required section title in the band above that section, at x 140', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Primeira', false, 'Um'),
      lesson('1-0', 1, 'Segunda', false, 'Dois'),
    ], [])
    assert.deepEqual(map.nodes.map(node => [node.x, node.y]), [[348, 96], [348, 330]])
    assert.deepEqual(map.sectionTitles.map(title => [title.x, title.y, title.place]), [[210, 21, 'band'], [210, 255, 'band']])
  })

  it('drops an overlapping optional-only section title below the opcional label', () => {
    const overlapped = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, LONG, true, 'Extra'),
    ], [])
    const title = overlapped.sectionTitles.find(item => item.place !== 'band')
    assert.deepEqual(title, { text: LONG, x: 492, y: 117, place: 'below' })

    const clear = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, 'A', true, 'Extra'),
    ], [])
    const above = clear.sectionTitles.find(item => item.text === 'A')
    assert.deepEqual(above, { text: 'A', x: 492, y: 3, place: 'above' })
  })

  it('lets a left branch extend the canvas past x 0', () => {
    const map = placeSkillPath(PYTHON, [
      lesson('0-0', 0, 'Python básico', false, 'Valores'),
      lesson('0-1', 0, 'Python básico', true, 'Extra'),
    ], ['0-0'])
    const extra = map.nodes.find(node => node.optional)
    assert.equal(extra?.x, -72)
    assert.equal(extra?.state, 'optional-open')
    assert.equal(map.minX, -114)
    assert.equal(map.strokes.find(stroke => stroke.width === 5)?.d, 'M 30 96 L -30 96')
  })

  it('keeps a multi-part count to the left of the node', () => {
    const map = placeSkillPath(PYTHON, [{
      ...lesson('0-0', 0, 'Python básico', false, 'Variável'),
      parts: 3,
      partsDone: 1,
    }], [])
    assert.equal(map.nodes[0].parts, 3)
    assert.equal(map.nodes[0].partsDone, 1)
    assert.equal(map.minX, -36)
    const finished = placeSkillPath(PYTHON, [{
      ...lesson('0-0', 0, 'Python básico', false, 'Variável'),
      parts: 3,
      partsDone: 1,
    }], ['0-0'])
    assert.equal(finished.nodes[0].partsDone, 3)
  })
})

describe('narrow stacked map', () => {
  const narrowLanes = { left: 42, center: 250, right: 329 }

  it('alternates required lessons between the left and the right edge', () => {
    const lessons = ['0-0', '0-1', '0-2', '0-3'].map(key => lesson(key, 0, 'Python básico'))
    const map = placeSkillPath(PYTHON, lessons, [], { laneX: narrowLanes, labelW: 0, stacked: true })
    assert.deepEqual(map.nodes.map(node => node.x), [42, 329, 42, 329])
  })

  it('ends the map a few pixels under the last node, not 128 px', () => {
    const lessons = ['0-0', '0-1', '0-2', '0-3'].map(key => lesson(key, 0, 'Python básico'))
    const map = placeSkillPath(PYTHON, lessons, [], { laneX: narrowLanes, labelW: 0, stacked: true })
    const lastBottom = Math.max(...map.nodes.map(node => node.y + 42))
    assert.equal(map.minY + map.height - lastBottom <= 16, true)
  })

  it('branches an optional lesson of a right-edge lesson to the left edge', () => {
    const lessons = [lesson('0-0', 0, 'S'), lesson('0-1', 0, 'S'), lesson('0-2', 0, 'S', true), lesson('0-3', 0, 'S')]
    const map = placeSkillPath(PYTHON, lessons, [], { laneX: narrowLanes, labelW: 0, stacked: true })
    assert.deepEqual(map.nodes.map(node => [node.x, node.trunkX]), [[42, undefined], [329, undefined], [42, 329], [42, undefined]])
  })
})

// Frozen. Changing the salt, Step, or the constants moves every course map.

export function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mix(state: number): number {
  state = (state + 0x9e3779b9) >>> 0
  let z = state
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
  return (z ^ (z >>> 16)) >>> 0
}

export type Lane = 'left' | 'center' | 'right'

const LANE_BY_INDEX = ['left', 'center', 'right'] as const

export function mainLanes(courseId: string, mainCount: number): Lane[] {
  let state = fnv1a(`devgrind.skillpath.v1:${courseId}`)
  const lanes: Lane[] = []
  let prev = 1
  for (let i = 0; i < mainCount; i++) {
    state = mix(state)
    const roll = state % 10
    let next: number
    if (roll <= 5) {
      if (prev === 1) next = ((state >>> 4) & 1) === 0 ? 0 : 2
      else next = 1
    } else if (roll <= 7) {
      next = prev
    } else if (prev === 0) {
      next = 2
    } else if (prev === 2) {
      next = 0
    } else {
      next = ((state >>> 4) & 1) === 0 ? 2 : 0
    }
    lanes.push(LANE_BY_INDEX[next])
    prev = next
  }
  return lanes
}

export function courseBranchSide(courseId: string): -1 | 1 {
  const seed = fnv1a(`devgrind.skillpath.v1:${courseId}`)
  return (seed & 1) === 0 ? -1 : 1
}

export const NODE = 56
export const NODE_RADIUS = 16
export const V_STEP = 128
export const BRANCH = 96
export const LANE_X: Record<Lane, number> = { left: 48, center: 140, right: 232 }
export const PAD_TOP = 8
export const TITLE_BLOCK = 28

export function mainNodeY(mainIndex: number, sectionStarts: readonly number[]): number {
  let titles = 0
  for (const start of sectionStarts) if (start <= mainIndex) titles += 1
  return PAD_TOP + titles * TITLE_BLOCK + mainIndex * V_STEP + NODE / 2
}

export function connector(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

export function branchPlacement(
  parentX: number,
  parentY: number,
  indexOnAnchor: number,
  firstSide: -1 | 1,
): { x: number; y: number; side: -1 | 1; depth: number } {
  const depth = Math.floor(indexOnAnchor / 2) + 1
  const side = indexOnAnchor % 2 === 0 ? firstSide : (firstSide === 1 ? -1 : 1)
  return { x: parentX + side * depth * BRANCH, y: parentY, side, depth }
}

const TITLE_LINE = 16
const TITLE_ABOVE = 18
const LESSON_TITLE_GAP = 6
const LESSON_TITLE_H = 33
const OPTIONAL_WORD_GAP = 4
const OPTIONAL_WORD_H = 14
const STACK_GAP = 4
const CHAR_W = 7.2
const CHAR_SP = 0.72
const COLUMN_W = 280

export interface PathLesson {
  key: string
  title: string
  optional: boolean
  sectionIndex: number
  sectionTitle: string
}

export type NodeState = 'done' | 'current' | 'locked' | 'optional-open' | 'optional-locked' | 'optional-done'

export interface PlacedNode {
  key: string
  title: string
  optional: boolean
  state: NodeState
  x: number
  y: number
}

export interface PlacedStroke {
  d: string
  width: 10 | 6
}

export interface PlacedSectionTitle {
  text: string
  x: number
  y: number
  place: 'band' | 'above' | 'below'
}

export interface SkillMap {
  nodes: PlacedNode[]
  strokes: PlacedStroke[]
  sectionTitles: PlacedSectionTitle[]
  minX: number
  minY: number
  width: number
  height: number
}

export function sectionTitleWidth(text: string): number {
  const glyphs = text.toUpperCase()
  if (glyphs.length === 0) return 0
  return glyphs.length * CHAR_W + (glyphs.length - 1) * CHAR_SP
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function titleBox(centerX: number, top: number, text: string): Box {
  const w = sectionTitleWidth(text)
  return { x: centerX - w / 2, y: top, w, h: TITLE_LINE }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function frame(nodes: PlacedNode[], strokes: PlacedStroke[], sectionTitles: PlacedSectionTitle[]): SkillMap {
  let minX = 0
  let maxX = COLUMN_W
  let minY = 0
  let maxY = PAD_TOP
  for (const node of nodes) {
    minX = Math.min(minX, node.x - NODE / 2)
    maxX = Math.max(maxX, node.x + NODE / 2)
    minY = Math.min(minY, node.y - NODE / 2)
    let bottom = node.y + NODE / 2 + LESSON_TITLE_GAP + LESSON_TITLE_H
    if (node.optional) bottom += OPTIONAL_WORD_GAP + OPTIONAL_WORD_H
    maxY = Math.max(maxY, bottom)
  }
  for (const title of sectionTitles) {
    const w = sectionTitleWidth(title.text)
    minX = Math.min(minX, title.x - w / 2)
    maxX = Math.max(maxX, title.x + w / 2)
    minY = Math.min(minY, title.y)
    maxY = Math.max(maxY, title.y + TITLE_LINE)
  }
  return { nodes, strokes, sectionTitles, minX, minY, width: maxX - minX, height: maxY - minY }
}

export function placeSkillPath(courseId: string, lessons: readonly PathLesson[], completed: readonly string[]): SkillMap {
  const done = new Set(completed)
  const required = lessons.filter(lesson => !lesson.optional)
  const firstSide = courseBranchSide(courseId)
  const nodes: PlacedNode[] = []
  const strokes: PlacedStroke[] = []
  const sectionTitles: PlacedSectionTitle[] = []
  const sectionOrder: number[] = []
  for (const lesson of lessons) {
    if (!sectionOrder.includes(lesson.sectionIndex)) sectionOrder.push(lesson.sectionIndex)
  }

  if (required.length === 0) {
    const y = PAD_TOP + sectionOrder.length * TITLE_BLOCK + NODE / 2
    lessons.forEach((lesson, index) => {
      const spot = branchPlacement(LANE_X.center, y, index, firstSide)
      nodes.push({
        key: lesson.key,
        title: lesson.title,
        optional: true,
        state: done.has(lesson.key) ? 'optional-done' : 'optional-open',
        x: spot.x,
        y: spot.y,
      })
    })
    sectionOrder.forEach((sectionIndex, index) => {
      const sample = lessons.find(lesson => lesson.sectionIndex === sectionIndex)
      if (!sample) return
      const top = PAD_TOP + index * TITLE_BLOCK + (TITLE_BLOCK - TITLE_LINE) / 2
      sectionTitles.push({ text: sample.sectionTitle, x: LANE_X.center, y: top, place: 'band' })
    })
    return frame(nodes, strokes, sectionTitles)
  }

  const lanes = mainLanes(courseId, required.length)
  const sectionStarts: number[] = []
  const seen = new Set<number>()
  required.forEach((lesson, index) => {
    if (seen.has(lesson.sectionIndex)) return
    seen.add(lesson.sectionIndex)
    sectionStarts.push(index)
  })
  const current = required.find(lesson => !done.has(lesson.key))?.key ?? null
  const requiredPos = new Map<string, { x: number; y: number }>()
  required.forEach((lesson, index) => {
    const x = LANE_X[lanes[index]]
    const y = mainNodeY(index, sectionStarts)
    requiredPos.set(lesson.key, { x, y })
    const state: NodeState = done.has(lesson.key) ? 'done' : lesson.key === current ? 'current' : 'locked'
    nodes.push({ key: lesson.key, title: lesson.title, optional: false, state, x, y })
  })
  for (let index = 0; index < required.length - 1; index++) {
    const from = requiredPos.get(required[index].key)!
    const to = requiredPos.get(required[index + 1].key)!
    strokes.push({ d: connector(from.x, from.y, to.x, to.y), width: 10 })
  }

  const titleBySection = new Map<number, Box>()
  for (const start of sectionStarts) {
    const lesson = required[start]
    const pos = requiredPos.get(lesson.key)!
    const top = pos.y - NODE / 2 - TITLE_BLOCK + (TITLE_BLOCK - TITLE_LINE) / 2
    sectionTitles.push({ text: lesson.sectionTitle, x: LANE_X.center, y: top, place: 'band' })
    titleBySection.set(lesson.sectionIndex, titleBox(LANE_X.center, top, lesson.sectionTitle))
  }

  const groups = new Map<string, PathLesson[]>()
  for (const lesson of required) groups.set(lesson.key, [])
  const beforeFirst: PathLesson[] = []
  let anchor: string | null = null
  for (const lesson of lessons) {
    if (!lesson.optional) {
      anchor = lesson.key
      continue
    }
    if (anchor === null) beforeFirst.push(lesson)
    else groups.get(anchor)!.push(lesson)
  }
  if (beforeFirst.length > 0) groups.get(required[0].key)!.unshift(...beforeFirst)

  for (const [anchorKey, optionals] of groups) {
    const parent = requiredPos.get(anchorKey)!
    const reached = anchorKey === current || done.has(anchorKey)
    optionals.forEach((lesson, index) => {
      const spot = branchPlacement(parent.x, parent.y, index, firstSide)
      const state: NodeState = done.has(lesson.key) ? 'optional-done' : reached ? 'optional-open' : 'optional-locked'
      nodes.push({ key: lesson.key, title: lesson.title, optional: true, state, x: spot.x, y: spot.y })
      const x0 = parent.x + spot.side * (NODE / 2)
      const x1 = spot.x - spot.side * (NODE / 2)
      strokes.push({ d: `M ${x0} ${parent.y} L ${x1} ${parent.y}`, width: 6 })
    })
  }

  const requiredSections = new Set(required.map(lesson => lesson.sectionIndex))
  for (const sectionIndex of sectionOrder) {
    if (requiredSections.has(sectionIndex)) continue
    const first = lessons.find(lesson => lesson.sectionIndex === sectionIndex && lesson.optional)
    if (!first) continue
    const placed = nodes.find(node => node.key === first.key)
    if (!placed) continue
    let owner: string | null = null
    for (const [anchorKey, optionals] of groups) {
      if (optionals.some(lesson => lesson.key === first.key)) owner = anchorKey
    }
    const ownerLesson = required.find(lesson => lesson.key === owner)
    const anchorBox = ownerLesson ? titleBySection.get(ownerLesson.sectionIndex) : undefined
    const defaultTop = placed.y - NODE / 2 - TITLE_ABOVE - TITLE_LINE
    const draft = titleBox(placed.x, defaultTop, first.sectionTitle)
    if (anchorBox && overlaps(draft, anchorBox)) {
      const below = placed.y + NODE / 2 + LESSON_TITLE_GAP + LESSON_TITLE_H + OPTIONAL_WORD_GAP + OPTIONAL_WORD_H + STACK_GAP
      sectionTitles.push({ text: first.sectionTitle, x: placed.x, y: below, place: 'below' })
    } else {
      sectionTitles.push({ text: first.sectionTitle, x: placed.x, y: defaultTop, place: 'above' })
    }
  }

  return frame(nodes, strokes, sectionTitles)
}

import { useEffect, type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import {
  placeSkillPath,
  FRACTION_GAP,
  FRACTION_W,
  LABEL_DESC_GAP,
  LABEL_DESC_H,
  LABEL_GAP,
  LABEL_TITLE_H,
  LABEL_W,
  NODE,
  NODE_RADIUS,
  OPTIONAL_WORD_GAP,
  OPTIONAL_WORD_H,
  type Lane,
  type NodeState,
  type PathLesson,
} from '../lib/skillPath'
import type { Section } from '../lib/courseModel'

const READABLE = 'color-mix(in srgb, var(--text) 55%, var(--bg))'
const NARROW_NODE_SCALE = 0.76
const NARROW_TEXT_GAP = 6
const NARROW_SECTION_CHAR = 7.9

function openable(state: NodeState): boolean {
  return state === 'done' || state === 'current' || state === 'optional-open' || state === 'optional-done'
}

function dimmed(state: NodeState): boolean {
  return state === 'locked' || state === 'optional-locked'
}

function fade(color: string, faded: boolean): string {
  return faded ? `color-mix(in srgb, ${color} 40%, var(--bg))` : color
}

function borderColor(state: NodeState): string {
  if (state === 'done' || state === 'optional-done') return 'var(--green)'
  if (state === 'current' || state === 'optional-open') return 'var(--cyan)'
  return 'var(--border)'
}

function quadLength(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): number {
  let length = 0
  let px = x0
  let py = y0
  for (let step = 1; step <= 24; step++) {
    const t = step / 24
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    length += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  return length
}

function ringPath(size: number, radius: number, stroke: number): { d: string; length: number } {
  const inset = stroke / 2
  const left = inset
  const top = inset
  const right = size - inset
  const bottom = size - inset
  const curve = Math.min(radius, (size - stroke) / 2)
  const mid = size / 2
  const xTopRight = right - curve
  const yRight = top + curve
  const yBottom = bottom - curve
  const xBottomLeft = left + curve
  const length = Math.abs(xTopRight - mid)
    + quadLength(xTopRight, top, right, top, right, yRight)
    + Math.abs(yBottom - yRight)
    + quadLength(right, yBottom, right, bottom, xTopRight, bottom)
    + Math.abs(xTopRight - xBottomLeft)
    + quadLength(xBottomLeft, bottom, left, bottom, left, yBottom)
    + Math.abs(yBottom - yRight)
    + quadLength(left, yRight, left, top, xBottomLeft, top)
    + Math.abs(mid - xBottomLeft)
  const d = [
    `M ${mid} ${top}`,
    `H ${xTopRight}`,
    `Q ${right} ${top} ${right} ${yRight}`,
    `V ${yBottom}`,
    `Q ${right} ${bottom} ${xTopRight} ${bottom}`,
    `H ${xBottomLeft}`,
    `Q ${left} ${bottom} ${left} ${yBottom}`,
    `V ${yRight}`,
    `Q ${left} ${top} ${xBottomLeft} ${top}`,
    `H ${mid}`,
  ].join(' ')
  return { d, length }
}

const RING_STROKE = 4
const RING = ringPath(NODE, NODE_RADIUS, RING_STROKE)
const RING_PATH = RING.d
const RING_LENGTH = RING.length

// Chrome drops the line-clamp ellipsis on right-aligned lines, so a clipped text falls back to left alignment.
function Description({ text, rightAligned, style }: { text: string; rightAligned: boolean; style: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text])
  return <span ref={ref} title={text} style={{ ...style, textAlign: rightAligned && !clipped ? 'right' : 'left' }}>{text}</span>
}

export default function SkillPath({
  courseId,
  sections,
  completed,
  partsDone,
  onOpen,
}: {
  courseId: string
  sections: Section[]
  completed: string[]
  partsDone: Record<string, number>
  onOpen: (key: string) => void
}) {
  const lessons: PathLesson[] = sections.flatMap(section => section.lessons.map(lesson => ({
    key: `${lesson.sectionIndex}-${lesson.lessonIndex}`,
    title: lesson.title,
    description: lesson.description,
    optional: lesson.optional,
    sectionIndex: lesson.sectionIndex,
    sectionTitle: section.title,
    parts: lesson.steps.length,
    partsDone: partsDone[`${lesson.sectionIndex}-${lesson.lessonIndex}`] ?? 0,
  })))
  const frameRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)
  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setAvailable(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const wide = placeSkillPath(courseId, lessons, completed)
  const narrow = available > 0 && available < wide.width
  const edge = NODE / 2
  const centerX = Math.min(available - edge - 40, edge + Math.round(available * 0.5))
  const narrowLanes: Record<Lane, number> = { left: edge, center: centerX, right: available - edge }
  const map = narrow
    ? placeSkillPath(courseId, lessons, completed, { laneX: narrowLanes, labelW: 0, fractionBeside: false, branchBelow: true })
    : wide
  const mapWidth = narrow ? available : map.width
  const originX = narrow ? 0 : map.minX
  const textLeft = (x: number) => narrow && x > available / 2
  const labelWidthFor = (node: { x: number; y: number }) => {
    if (!narrow) return LABEL_W
    const left = textLeft(node.x)
    return Math.max(80, left ? node.x - edge - NARROW_TEXT_GAP : available - (node.x + edge + NARROW_TEXT_GAP))
  }
  const sectionHalf = (text: string) => (text.length * NARROW_SECTION_CHAR) / 2
  const required = lessons.filter(lesson => !lesson.optional)
  const previousTitle = new Map(required.slice(1).map((lesson, index) => [lesson.key, required[index].title]))
  const targetKey = (map.nodes.find(n => n.state === 'current') ?? map.nodes.find(n => n.state === 'optional-open') ?? map.nodes[0])?.key
  const targetRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    targetRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
  }, [courseId])

  return (
    <div ref={frameRef} style={{ width: '100%', overflowX: narrow ? 'hidden' : 'auto' }}>
      <div style={{ position: 'relative', width: mapWidth, height: map.height, marginInline: 'auto' }}>
        <svg
          width={mapWidth}
          height={map.height}
          viewBox={`${originX} ${map.minY} ${mapWidth} ${map.height}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {map.strokes.map(stroke => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              stroke="var(--muted)"
              strokeOpacity={0.45}
              strokeWidth={narrow ? stroke.width * NARROW_NODE_SCALE : stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {map.sectionTitles.map(title => (
          <p
            key={`${title.place}-${title.x}-${title.y}-${title.text}`}
            style={{
              position: 'absolute',
              left: narrow ? Math.min(Math.max(title.x, sectionHalf(title.text)), available - sectionHalf(title.text)) : title.x - map.minX,
              top: title.y - map.minY,
              transform: 'translateX(-50%)',
              margin: 0,
              fontFamily: 'var(--font)',
              fontSize: narrow ? 'var(--fs-sm)' : 18,
              lineHeight: '24px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: READABLE,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {title.text}
          </p>
        ))}
        {map.nodes.map(node => {
          const locked = !openable(node.state)
          const faded = dimmed(node.state)
          const ratio = node.parts > 1 ? node.partsDone / node.parts : 0
          const mirrored = textLeft(node.x)
          const textW = labelWidthFor(node)
          const boxW = NODE + NARROW_TEXT_GAP + textW
          const fractionColor = fade(ratio === 0 ? (locked ? 'var(--muted)' : 'var(--cyan)') : 'var(--green)', faded)
          return (
            <button
              key={node.key}
              type="button"
              disabled={locked}
              aria-current={node.state === 'current' ? 'step' : undefined}
              onClick={() => { if (locked) return; onOpen(node.key) }}
              style={{
                position: 'absolute',
                left: narrow ? (mirrored ? node.x + NODE / 2 - boxW : node.x - NODE / 2) : node.x - map.minX - NODE / 2,
                top: node.y - map.minY - NODE / 2,
                width: narrow ? boxW : NODE + LABEL_GAP + textW,
                display: 'flex',
                flexDirection: narrow && mirrored ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: narrow ? NARROW_TEXT_GAP : LABEL_GAP,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'var(--font)',
                textAlign: narrow && mirrored ? 'right' : 'left',
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              {node.parts > 1 && !narrow && (
                <span style={{
                  position: 'absolute',
                  left: -(FRACTION_W + FRACTION_GAP),
                  top: (NODE - 22) / 2,
                  width: FRACTION_W,
                  textAlign: 'right',
                  fontFamily: 'var(--font)',
                  fontSize: 16,
                  lineHeight: '22px',
                  color: fractionColor,
                  background: 'var(--bg)',
                }}>
                  {node.partsDone}/{node.parts}
                </span>
              )}
              <span ref={node.key === targetKey ? targetRef : undefined} style={{
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                position: 'relative',
                width: NODE,
                height: NODE,
                borderRadius: NODE_RADIUS,
                background: 'var(--bg-card)',
                border: node.parts > 1 ? 'none' : `3px solid ${fade(borderColor(node.state), faded)}`,
                boxShadow: node.state === 'current' ? '0 0 0 6px var(--cyan-glow)' : 'none',
                transform: narrow ? `scale(${NARROW_NODE_SCALE})` : undefined,
              }}>
                {node.parts > 1 && (
                  <svg width={NODE} height={NODE} viewBox={`0 0 ${NODE} ${NODE}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                    <path d={RING_PATH} fill="none" stroke={ratio >= 1 ? 'var(--green)' : locked ? fade('var(--border)', faded) : 'var(--cyan)'} strokeWidth={RING_STROKE} />
                    {ratio > 0 && (
                      <path
                        d={RING_PATH}
                        fill="none"
                        stroke="var(--green)"
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${ratio * RING_LENGTH} ${RING_LENGTH}`}
                      />
                    )}
                  </svg>
                )}
                {(node.state === 'done' || node.state === 'optional-done') && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="feita">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {node.state === 'current' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
                  </svg>
                )}
              </span>
              <span style={{ display: 'block', width: textW, minWidth: 0 }}>
                <span style={narrow ? {
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: mirrored ? 'flex-end' : 'flex-start',
                  gap: NARROW_TEXT_GAP,
                } : { display: 'block' }}>
                  <span style={narrow ? {
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    fontFamily: 'var(--font)',
                    fontSize: 'var(--fs-lg)',
                    lineHeight: '22px',
                    color: fade(faded ? 'var(--muted)' : 'var(--text)', faded),
                  } : {
                    display: 'block',
                    height: LABEL_TITLE_H,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font)',
                    fontSize: 20,
                    lineHeight: `${LABEL_TITLE_H}px`,
                    color: fade(faded ? 'var(--muted)' : 'var(--text)', faded),
                    background: 'var(--bg)',
                  }}>
                    {node.title}
                  </span>
                  {narrow && node.parts > 1 && (
                    <span style={{ flexShrink: 0, fontFamily: 'var(--font)', fontSize: 'var(--fs-sm)', lineHeight: '22px', color: fractionColor }}>
                      {node.partsDone}/{node.parts}
                    </span>
                  )}
                </span>
                {node.description.trim() && (
                  <Description
                    text={node.description}
                    rightAligned={narrow && mirrored}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: narrow ? 3 : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      maxHeight: narrow ? 60 : LABEL_DESC_H,
                      marginTop: LABEL_DESC_GAP,
                      fontFamily: 'var(--font)',
                      fontSize: narrow ? 'var(--fs-base)' : 18,
                      lineHeight: narrow ? '20px' : '24px',
                      color: fade(READABLE, faded && !narrow),
                      background: 'var(--bg)',
                    }}
                  />
                )}
                {node.optional && (
                  <span style={{
                    display: 'block',
                    marginTop: OPTIONAL_WORD_GAP,
                    fontFamily: 'var(--font)',
                    fontSize: narrow ? 'var(--fs-sm)' : 14,
                    lineHeight: `${OPTIONAL_WORD_H}px`,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: fade(READABLE, faded),
                    background: 'var(--bg)',
                  }}>
                    opcional
                  </span>
                )}
                {locked && !node.optional && (
                  <span style={{
                    display: 'block',
                    marginTop: OPTIONAL_WORD_GAP,
                    fontFamily: 'var(--font)',
                    fontSize: narrow ? 'var(--fs-sm)' : 14,
                    lineHeight: '20px',
                    color: READABLE,
                    background: 'var(--bg)',
                  }}>
                    {previousTitle.get(node.key)
                      ? `Termine «${previousTitle.get(node.key)}» para liberar`
                      : 'Termine a lição anterior para liberar'}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

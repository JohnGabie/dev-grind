import { useEffect, useRef } from 'react'
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
  type NodeState,
  type PathLesson,
} from '../lib/skillPath'
import type { Section } from '../lib/courseModel'

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
  const map = placeSkillPath(courseId, lessons, completed)
  const required = lessons.filter(lesson => !lesson.optional)
  const previousTitle = new Map(required.slice(1).map((lesson, index) => [lesson.key, required[index].title]))
  const targetKey = (map.nodes.find(n => n.state === 'current') ?? map.nodes.find(n => n.state === 'optional-open') ?? map.nodes[0])?.key
  const targetRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    targetRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
  }, [courseId])

  return (
    <div style={{ width: 'fit-content', maxWidth: '100%', marginInline: 'auto', overflowX: 'auto' }}>
      <div style={{ position: 'relative', width: map.width, height: map.height }}>
        <svg
          width={map.width}
          height={map.height}
          viewBox={`${map.minX} ${map.minY} ${map.width} ${map.height}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {map.strokes.map(stroke => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              stroke="var(--muted)"
              strokeOpacity={0.45}
              strokeWidth={stroke.width}
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
              left: title.x - map.minX,
              top: title.y - map.minY,
              transform: 'translateX(-50%)',
              margin: 0,
              fontFamily: 'var(--font)',
              fontSize: 18,
              lineHeight: '24px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
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
          return (
            <button
              key={node.key}
              type="button"
              disabled={locked}
              aria-current={node.state === 'current' ? 'step' : undefined}
              onClick={() => { if (locked) return; onOpen(node.key) }}
              style={{
                position: 'absolute',
                left: node.x - map.minX - NODE / 2,
                top: node.y - map.minY - NODE / 2,
                width: NODE + LABEL_GAP + LABEL_W,
                display: 'flex',
                alignItems: 'flex-start',
                gap: LABEL_GAP,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'var(--font)',
                textAlign: 'left',
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              {node.parts > 1 && (
                <span style={{
                  position: 'absolute',
                  left: -(FRACTION_W + FRACTION_GAP),
                  top: (NODE - 22) / 2,
                  width: FRACTION_W,
                  textAlign: 'right',
                  fontFamily: 'var(--font)',
                  fontSize: 16,
                  lineHeight: '22px',
                  color: fade(ratio === 0 ? (locked ? 'var(--muted)' : 'var(--cyan)') : 'var(--green)', faded),
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
              <span style={{ display: 'block', width: LABEL_W, minWidth: 0 }}>
                <span style={{
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
                {node.description.trim() && (
                  <span
                    title={node.description}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      maxHeight: LABEL_DESC_H,
                      marginTop: LABEL_DESC_GAP,
                      fontFamily: 'var(--font)',
                      fontSize: 18,
                      lineHeight: '24px',
                      color: fade('var(--muted)', faded),
                      background: 'var(--bg)',
                    }}
                  >
                    {node.description}
                  </span>
                )}
                {node.optional && (
                  <span style={{
                    display: 'block',
                    marginTop: OPTIONAL_WORD_GAP,
                    fontFamily: 'var(--font)',
                    fontSize: 14,
                    lineHeight: `${OPTIONAL_WORD_H}px`,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: fade('var(--muted)', faded),
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
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'var(--muted)',
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

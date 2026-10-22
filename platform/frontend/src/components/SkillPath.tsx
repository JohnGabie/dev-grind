import { useCallback, useEffect, type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
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
const TRUNK_CLEAR = 8
const MIN_OPTIONAL_DESC_W = 96
const NARROW_TITLE = 'color-mix(in srgb, var(--text) 75%, var(--bg))'
const NARROW_SECTION_CHAR = 7.9
const SECTION_PAD = 6

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

// Chrome drops the line-clamp ellipsis on right-aligned lines, so the narrow layout cuts the text itself.
function ClampText({ text, lines, lineHeight, style, onFit }: { text: string; lines: number; lineHeight: number; style: CSSProperties; onFit: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const limit = lines * lineHeight + 1
    const cut = () => {
      el.textContent = text
      if (el.scrollHeight <= limit) return
      const words = text.split(' ')
      let lo = 0
      let hi = words.length - 1
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        el.textContent = words.slice(0, mid).join(' ') + '…'
        if (el.scrollHeight <= limit) lo = mid
        else hi = mid - 1
      }
      el.textContent = words.slice(0, lo).join(' ') + '…'
    }
    const fit = () => {
      cut()
      onFit()
    }
    const refit = fit
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    void document.fonts.ready.then(refit)
    document.fonts.addEventListener('loadingdone', refit)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', refit)
    }
  }, [text, lines, lineHeight, onFit])
  return <span ref={ref} title={text} style={{ ...style, display: 'block' }} />
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
  const [heights, setHeights] = useState<Record<string, number>>({})
  const innerRef = useRef<HTMLDivElement>(null)
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
  const rightX = available - edge
  const centerX = Math.min(rightX - 40, edge + Math.round(available * 0.56))
  const narrowLanes: Record<Lane, number> = { left: edge, center: centerX, right: rightX }
  const map = narrow
    ? placeSkillPath(courseId, lessons, completed, { laneX: narrowLanes, labelW: 0, stacked: true, labelHeight: key => heights[key] ?? 0 })
    : wide
  const mapWidth = narrow ? available : map.width
  const originX = narrow ? 0 : map.minX
  const textLeft = (x: number) => narrow && x > available / 2
  const labelWidthFor = (node: { x: number; trunkX?: number }) => {
    if (!narrow) return LABEL_W
    const left = textLeft(node.x)
    const trunk = node.trunkX ?? null
    if (trunk !== null && trunk !== node.x) {
      return Math.max(60, left ? node.x - edge - NARROW_TEXT_GAP - (trunk + TRUNK_CLEAR) : trunk - TRUNK_CLEAR - (node.x + edge + NARROW_TEXT_GAP))
    }
    return Math.max(80, left ? node.x - edge - NARROW_TEXT_GAP : available - (node.x + edge + NARROW_TEXT_GAP))
  }
  const sectionHalf = (text: string) => (text.length * NARROW_SECTION_CHAR) / 2 + SECTION_PAD
  const required = lessons.filter(lesson => !lesson.optional)
  const previousTitle = new Map(required.slice(1).map((lesson, index) => [lesson.key, required[index].title]))
  const targetKey = (map.nodes.find(n => n.state === 'current') ?? map.nodes.find(n => n.state === 'optional-open') ?? map.nodes[0])?.key
  const targetRef = useRef<HTMLSpanElement>(null)

  const measure = useCallback(() => {
    const next: Record<string, number> = {}
    innerRef.current?.querySelectorAll<HTMLButtonElement>(':scope > button').forEach(button => {
      if (button.dataset.key) next[button.dataset.key] = Math.ceil(button.offsetHeight)
    })
    setHeights(prev => {
      const keys = Object.keys(next)
      return keys.length === Object.keys(prev).length && keys.every(key => prev[key] === next[key]) ? prev : next
    })
  }, [])

  useLayoutEffect(() => {
    if (!narrow) return
    const observer = new ResizeObserver(measure)
    innerRef.current?.querySelectorAll(':scope > button').forEach(button => observer.observe(button))
    const later = () => { requestAnimationFrame(measure) }
    void document.fonts.ready.then(later)
    document.fonts.addEventListener('loadingdone', later)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', later)
    }
  })

  useEffect(() => {
    targetRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
  }, [courseId])

  return (
    <div ref={frameRef} style={{ width: '100%', overflowX: narrow ? 'hidden' : 'auto' }}>
      <div ref={innerRef} style={{ position: 'relative', width: mapWidth, height: map.height, marginInline: 'auto' }}>
        <svg
          width={mapWidth}
          height={map.height}
          viewBox={`${originX} ${map.minY} ${mapWidth} ${map.height}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <g opacity={narrow ? 0.45 : undefined}>
          {map.strokes.map(stroke => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              stroke="var(--muted)"
              strokeOpacity={narrow ? 1 : 0.45}
              strokeWidth={narrow ? stroke.width * NARROW_NODE_SCALE : stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          </g>
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
              ...(narrow ? { background: 'var(--bg)', padding: `0 ${SECTION_PAD}px` } : {}),
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
          const glue = node.title.length - node.title.lastIndexOf(' ') - 1 <= 10
          const textW = labelWidthFor(node)
          const boxW = NODE + NARROW_TEXT_GAP + textW
          const fractionColor = fade(ratio === 0 ? (locked ? 'var(--muted)' : 'var(--cyan)') : 'var(--green)', faded)
          return (
            <button
              key={node.key}
              data-key={node.key}
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
                {narrow ? (
                  <span style={{
                    display: 'block',
                    overflowWrap: 'anywhere',
                    fontFamily: 'var(--font)',
                    fontSize: 'var(--fs-lg)',
                    lineHeight: '22px',
                    color: faded ? NARROW_TITLE : 'var(--text)',
                  }}>
                    {glue ? node.title.slice(0, node.title.lastIndexOf(' ') + 1) : node.title}
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {glue ? node.title.slice(node.title.lastIndexOf(' ') + 1) : ''}
                      {node.parts > 1 && (
                        <span style={{ marginLeft: NARROW_TEXT_GAP, fontSize: 'var(--fs-sm)', color: fractionColor }}>
                          {node.partsDone}/{node.parts}
                        </span>
                      )}
                    </span>
                  </span>
                ) : (
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
                )}
                {node.description.trim() && !(narrow && node.optional && textW < MIN_OPTIONAL_DESC_W) && (narrow ? (
                  <ClampText
                    onFit={measure}
                    text={node.description}
                    lines={3}
                    lineHeight={20}
                    style={{
                      marginTop: LABEL_DESC_GAP,
                      fontFamily: 'var(--font)',
                      fontSize: 'var(--fs-base)',
                      lineHeight: '20px',
                      color: READABLE,
                      background: 'var(--bg)',
                    }}
                  />
                ) : (
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
                      color: fade(READABLE, faded),
                      background: 'var(--bg)',
                    }}
                  >
                    {node.description}
                  </span>
                ))}
                {node.optional && (
                  <span style={{
                    display: 'block',
                    marginTop: OPTIONAL_WORD_GAP,
                    fontFamily: 'var(--font)',
                    fontSize: narrow ? 'var(--fs-sm)' : 14,
                    lineHeight: `${OPTIONAL_WORD_H}px`,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: fade(READABLE, faded && !narrow),
                    background: 'var(--bg)',
                  }}>
                    opcional
                  </span>
                )}
                {locked && !node.optional && (() => {
                  const reason = previousTitle.get(node.key)
                    ? `Termine «${previousTitle.get(node.key)}» para liberar`
                    : 'Termine a lição anterior para liberar'
                  const style: CSSProperties = {
                    marginTop: OPTIONAL_WORD_GAP,
                    fontFamily: 'var(--font)',
                    fontSize: narrow ? 'var(--fs-sm)' : 14,
                    lineHeight: '20px',
                    color: READABLE,
                    background: 'var(--bg)',
                  }
                  return narrow
                    ? <ClampText onFit={measure} text={reason} lines={2} lineHeight={20} style={style} />
                    : <span style={{ ...style, display: 'block' }}>{reason}</span>
                })()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

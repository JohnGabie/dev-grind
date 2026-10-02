import { placeSkillPath, NODE, type NodeState, type PathLesson } from '../lib/skillPath'
import type { Section } from '../lib/courseModel'

function openable(state: NodeState): boolean {
  return state === 'done' || state === 'current' || state === 'optional-open' || state === 'optional-done'
}

function dimmed(state: NodeState): boolean {
  return state === 'locked' || state === 'optional-locked'
}

function borderColor(state: NodeState): string {
  if (state === 'done' || state === 'optional-done') return 'var(--green)'
  if (state === 'current' || state === 'optional-open') return 'var(--cyan)'
  return 'var(--border)'
}

export default function SkillPath({
  courseId,
  sections,
  completed,
  onOpen,
}: {
  courseId: string
  sections: Section[]
  completed: string[]
  onOpen: (key: string) => void
}) {
  const lessons: PathLesson[] = sections.flatMap(section => section.lessons.map(lesson => ({
    key: `${lesson.sectionIndex}-${lesson.lessonIndex}`,
    title: lesson.title,
    optional: lesson.optional,
    sectionIndex: lesson.sectionIndex,
    sectionTitle: section.title,
  })))
  const map = placeSkillPath(courseId, lessons, completed)

  return (
    <div style={{ width: 'fit-content', maxWidth: '100%', marginInline: 'auto', overflowX: 'auto' }}>
      <div style={{
        position: 'relative',
        width: map.width,
        height: map.height,
        backgroundImage: 'radial-gradient(circle, var(--border) 1.2px, transparent 1.4px)',
        backgroundSize: '16px 16px',
      }}>
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
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
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
          return (
            <button
              key={node.key}
              type="button"
              disabled={locked}
              aria-current={node.state === 'current' ? 'step' : undefined}
              onClick={() => { if (locked) return; onOpen(node.key) }}
              style={{
                position: 'absolute',
                left: node.x - map.minX - 44,
                top: node.y - map.minY - NODE / 2,
                width: 88,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'var(--font)',
                cursor: locked ? 'default' : 'pointer',
                opacity: faded ? 0.4 : 1,
              }}
            >
              <span style={{
                display: 'grid',
                placeItems: 'center',
                width: NODE,
                height: NODE,
                marginInline: 'auto',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: `2px solid ${borderColor(node.state)}`,
                boxShadow: node.state === 'current' ? '0 0 0 4px var(--cyan-glow)' : 'none',
              }}>
                {(node.state === 'done' || node.state === 'optional-done') && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="feita">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {node.state === 'current' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
                  </svg>
                )}
              </span>
              <span style={{
                display: 'block',
                width: 88,
                marginTop: 6,
                padding: '0 4px',
                boxSizing: 'border-box',
                fontFamily: 'var(--font)',
                fontSize: 12,
                lineHeight: 1.35,
                maxHeight: 33,
                overflow: 'hidden',
                textAlign: 'center',
                color: faded ? 'var(--muted)' : 'var(--text)',
                background: 'var(--bg)',
              }}>
                {node.title}
              </span>
              {node.optional && (
                <span style={{
                  display: 'block',
                  marginTop: 4,
                  fontFamily: 'var(--font)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: 'var(--muted)',
                }}>
                  opcional
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

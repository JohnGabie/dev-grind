import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { totalVisualLines, visualLineCounts } from './visualLines'

export default function CodeBlock({ lines, onLineCount }: { lines: ReactNode[]; onLineCount?: (total: number) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const [counts, setCounts] = useState<number[]>([])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(root).lineHeight)
      const next = visualLineCounts(lines.map((_, i) => rowRefs.current[i]?.getBoundingClientRect().height ?? 0), lineHeight)
      setCounts(prev => (prev.length === next.length && prev.every((n, i) => n === next[i]) ? prev : next))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [lines])

  const perRow = lines.map((_, i) => counts[i] ?? 1)
  const total = totalVisualLines(perRow)
  const digits = String(total).length
  const reported = useRef(onLineCount)
  reported.current = onLineCount
  useLayoutEffect(() => { reported.current?.(total) }, [total])

  return (
    <div ref={rootRef} style={{ display: 'flex', gap: 'var(--sp-3)', fontFamily: 'var(--font)', fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)' }}>
      <div aria-hidden="true" style={{
        width: `${digits}ch`, flexShrink: 0, textAlign: 'right', color: 'var(--muted)', userSelect: 'none', whiteSpace: 'pre',
      }}>
        {Array.from({ length: total }, (_, i) => i + 1).join('\n')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {lines.map((content, i) => (
          <div
            key={i}
            ref={el => { rowRefs.current[i] = el }}
            style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text)' }}
          >
            {content}
          </div>
        ))}
      </div>
    </div>
  )
}

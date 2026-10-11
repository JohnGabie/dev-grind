import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { LEVEL_COLOR, TODAY_EMPTY, buildWeeks, describeDay, levelOf, type HeatmapDay } from '../heatmap'
import Readout from '../Readout'
import Section from '../Section'

const CELL = 12
const GAP = 4

export default function HeatmapSection({ heatmap }: { heatmap: Record<string, HeatmapDay> }) {
  const [full, setFull] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const weeks = buildWeeks(heatmap, new Date(), full ? 53 : 20)
  const cells = weeks.flat().filter(c => c !== null)
  const active = cells.find(c => c.date === selected) ?? cells.find(c => c.isToday) ?? null

  useEffect(() => {
    if (full && scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [full])

  const pick = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const date = el?.getAttribute('data-date')
    if (date) setSelected(date)
  }

  return (
    <Section label={full ? 'atividade · 365 dias' : 'atividade · 20 semanas'}>
      <div ref={scroller} style={{ overflowX: full ? 'auto' : 'hidden' }}>
        <div
          onPointerDown={pick}
          onPointerMove={e => { if (e.buttons === 1) pick(e) }}
          style={{ display: 'flex', gap: GAP, touchAction: full ? 'pan-x pan-y' : 'pan-y', width: 'max-content' }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  data-date={cell?.date}
                  style={{
                    width: CELL, height: CELL, borderRadius: 2, boxSizing: 'border-box',
                    background: !cell ? 'transparent' : cell.isToday && cell.data.total === 0 ? TODAY_EMPTY : LEVEL_COLOR[levelOf(cell.data.total)],
                    outline: cell && cell.date === active?.date ? '1px solid var(--text)' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Readout>{active ? describeDay(active.date, active.data) : 'sem atividade'}</Readout>
      <button type="button" onClick={() => { setFull(f => !f); setSelected(null) }} style={{
        minHeight: 'var(--ctl-md)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--cyan)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font)',
      }}>
        {full ? 'mostrar 20 semanas' : 'ver 365 dias'}
      </button>
    </Section>
  )
}

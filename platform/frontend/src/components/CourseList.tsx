import type { ListEntry } from '../lib/listEntry'
import type { ViewKey } from '../lib/courseView'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import CourseCard from './CourseCard'
import CourseGalleryTile from './CourseGalleryTile'
import CourseRow from './CourseRow'
import CourseTile from './CourseTile'

interface Props {
  entries: ListEntry[]
  view: ViewKey
  onOpen: (entry: ListEntry) => void
  onAction: (entry: ListEntry) => void
  selectMode?: boolean
  selected?: ReadonlySet<string>
  onToggle?: (entry: ListEntry) => void
}

export default function CourseList({ entries, view, onOpen, onAction, selectMode = false, selected, onToggle }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const grid = (columns: string) => ({ display: 'grid', gridTemplateColumns: columns, gap: 12, width: '100%' })
  const selection = (entry: ListEntry) => ({ selectMode, selected: selected?.has(entry.id) ?? false, onToggle: () => onToggle?.(entry) })

  if (view === 'grade') {
    return (
      <div style={grid(isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))')}>
        {entries.map(entry => <CourseTile key={entry.id} entry={entry} onOpen={() => onOpen(entry)} {...selection(entry)} />)}
      </div>
    )
  }
  if (view === 'galeria') {
    return (
      <div style={grid(isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))')}>
        {entries.map(entry => <CourseGalleryTile key={entry.id} entry={entry} onOpen={() => onOpen(entry)} onAction={() => onAction(entry)} {...selection(entry)} />)}
      </div>
    )
  }
  const Item = view === 'lista' ? CourseRow : CourseCard
  const columns = view === 'lista' || isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(420px, 1fr))'
  return (
    <div style={grid(columns)}>
      {entries.map(entry => <Item key={entry.id} entry={entry} onOpen={() => onOpen(entry)} onAction={() => onAction(entry)} {...selection(entry)} />)}
    </div>
  )
}

import type { Course } from '../lib/courseModel'
import type { ViewKey } from '../lib/courseView'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import CourseCard from './CourseCard'
import CourseGalleryTile from './CourseGalleryTile'
import CourseRow from './CourseRow'
import CourseTile from './CourseTile'

interface Props {
  courses: Course[]
  view: ViewKey
  onOpen: (course: Course) => void
  onAction: (course: Course) => void
}

export default function CourseList({ courses, view, onOpen, onAction }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const grid = (columns: string) => ({ display: 'grid', gridTemplateColumns: columns, gap: 12, width: '100%' })

  if (view === 'grade') {
    return (
      <div style={grid(isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))')}>
        {courses.map(course => <CourseTile key={course.id} course={course} onOpen={() => onOpen(course)} />)}
      </div>
    )
  }
  if (view === 'galeria') {
    return (
      <div style={grid(isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))')}>
        {courses.map(course => <CourseGalleryTile key={course.id} course={course} onOpen={() => onOpen(course)} onAction={() => onAction(course)} />)}
      </div>
    )
  }
  const Item = view === 'lista' ? CourseRow : CourseCard
  const columns = view === 'lista' || isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(420px, 1fr))'
  return (
    <div style={grid(columns)}>
      {courses.map(course => <Item key={course.id} course={course} onOpen={() => onOpen(course)} onAction={() => onAction(course)} />)}
    </div>
  )
}

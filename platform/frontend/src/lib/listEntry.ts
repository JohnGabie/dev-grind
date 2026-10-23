import type { Course } from './courseModel'
import { actionLabel, courseProgress, type CourseState } from './courseProgress.ts'

export interface ListEntry {
  id: string
  kind: 'course' | 'roadmap'
  title: string
  description: string | null
  created_at?: string
  done: number
  total: number
  state: CourseState
  action: 'começar' | 'continuar' | 'revisar' | null
  detail?: string
  position?: number
}

export function courseEntry(course: Course, position?: number): ListEntry {
  const { done, total, state } = courseProgress(course)
  return {
    id: course.id,
    kind: 'course',
    title: course.title,
    description: course.description,
    created_at: course.created_at,
    done,
    total,
    state,
    action: actionLabel(state),
    position,
  }
}

import type { Course } from './courseModel.ts'
import { actionLabel, continueTarget, courseProgress, type CourseState } from './courseProgress.ts'
import type { ListEntry } from './listEntry.ts'

export interface Roadmap {
  id: string
  title: string
  description: string | null
  created_at: string
  course_ids: string[]
}

export function asRoadmap(row: unknown): Roadmap | null {
  if (typeof row !== 'object' || row === null) return null
  const raw = row as Record<string, unknown>
  if (typeof raw.id !== 'string' || raw.id === '') return null
  if (typeof raw.title !== 'string' || raw.title === '') return null
  if (!Array.isArray(raw.course_ids)) return null
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
    course_ids: raw.course_ids.filter((id): id is string => typeof id === 'string'),
  }
}

export function roadmapCourses(roadmap: Roadmap, byId: Map<string, Course>): Course[] {
  return roadmap.course_ids.flatMap(id => {
    const course = byId.get(id)
    return course ? [course] : []
  })
}

export function roadmapProgress(roadmap: Roadmap, byId: Map<string, Course>): { courses: number; done: number; total: number; state: CourseState } {
  const members = roadmapCourses(roadmap, byId).map(courseProgress)
  const done = members.reduce((sum, item) => sum + item.done, 0)
  const total = members.reduce((sum, item) => sum + item.total, 0)
  const state: CourseState = total > 0 && done >= total && members.every(item => item.state === 'concluído')
    ? 'concluído'
    : done > 0 || members.some(item => item.state !== 'não iniciado')
      ? 'em andamento'
      : 'não iniciado'
  return { courses: members.length, done, total, state }
}

export function roadmapTarget(roadmap: Roadmap, byId: Map<string, Course>): { courseId: string; lessonKey: string | null } | null {
  const next = roadmapCourses(roadmap, byId).find(course => courseProgress(course).state !== 'concluído')
  return next ? { courseId: next.id, lessonKey: continueTarget(next) } : null
}

export function roadmapEntry(roadmap: Roadmap, byId: Map<string, Course>): ListEntry {
  const { courses, done, total, state } = roadmapProgress(roadmap, byId)
  return {
    id: roadmap.id,
    kind: 'roadmap',
    title: roadmap.title,
    description: roadmap.description,
    created_at: roadmap.created_at,
    done,
    total,
    state,
    action: courses === 0 ? null : actionLabel(state),
    detail: courses === 1 ? '1 curso' : `${courses} cursos`,
  }
}

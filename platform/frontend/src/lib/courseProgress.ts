import type { Course } from './courseModel'

export type CourseState = 'não iniciado' | 'em andamento' | 'concluído'

export interface CourseProgress { done: number; total: number; state: CourseState }

export function lessonKeyOf(lesson: { sectionIndex: number; lessonIndex: number }): string {
  return `${lesson.sectionIndex}-${lesson.lessonIndex}`
}

export function courseProgress(course: Course): CourseProgress {
  const completed = new Set(course.completed)
  let done = 0
  let total = 0
  for (const lesson of course.sections.flatMap(section => section.lessons)) {
    const isDone = completed.has(lessonKeyOf(lesson))
    if (!lesson.optional || isDone) total++
    if (isDone) done++
  }
  const started = done > 0 || Object.values(course.parts).some(count => count > 0)
  const state: CourseState = total > 0 && done >= total ? 'concluído' : started ? 'em andamento' : 'não iniciado'
  return { done, total, state }
}

export function continueTarget(course: Course): string | null {
  const completed = new Set(course.completed)
  for (const lesson of course.sections.flatMap(section => section.lessons)) {
    if (!lesson.optional && !completed.has(lessonKeyOf(lesson))) return lessonKeyOf(lesson)
  }
  return null
}

const GROUP: Record<CourseState, number> = { 'em andamento': 0, 'não iniciado': 1, 'concluído': 2 }

export function orderCourses<T extends Course>(courses: T[]): T[] {
  return courses
    .map((course, index) => ({ course, index, group: GROUP[courseProgress(course).state] }))
    .sort((a, b) => a.group - b.group || a.index - b.index)
    .map(entry => entry.course)
}

export function actionLabel(state: CourseState): 'começar' | 'continuar' | 'revisar' {
  return state === 'concluído' ? 'revisar' : state === 'em andamento' ? 'continuar' : 'começar'
}

export function isInsideCourse(pathname: string): boolean {
  return /^\/courses\/[^/]/.test(pathname)
}

export function isInsideLesson(pathname: string): boolean {
  return /^\/courses\/[^/]+\/[^/]/.test(pathname)
}

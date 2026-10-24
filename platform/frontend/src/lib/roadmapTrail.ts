import type { Course } from './courseModel.ts'
import { percentOf } from './courseDisplay.ts'
import { courseProgress, type CourseState } from './courseProgress.ts'
import { roadmapCourses, stateMembers, type Roadmap } from './roadmapModel.ts'

export interface TrailStage {
  id: string
  position: number
  title: string
  done: number
  total: number
  percent: number
  state: CourseState
  current: boolean
}

export function trailStages(roadmap: Roadmap, byId: Map<string, Course>): TrailStage[] {
  const currentId = stateMembers(roadmap, byId).find(course => courseProgress(course).state !== 'concluído')?.id
  return roadmapCourses(roadmap, byId).map((course, index) => {
    const { done, total, state } = courseProgress(course)
    const current = course.id === currentId
    return { id: course.id, position: index + 1, title: course.title, done, total, percent: percentOf(done, total), state, current }
  })
}

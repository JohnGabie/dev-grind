import type { Course } from './courseModel.ts'
import { percentOf } from './courseDisplay.ts'
import { courseProgress, type CourseState } from './courseProgress.ts'
import { roadmapCourses, type Roadmap } from './roadmapModel.ts'

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
  let currentTaken = false
  return roadmapCourses(roadmap, byId).map((course, index) => {
    const { done, total, state } = courseProgress(course)
    const current = !currentTaken && state !== 'concluído'
    if (current) currentTaken = true
    return { id: course.id, position: index + 1, title: course.title, done, total, percent: percentOf(done, total), state, current }
  })
}

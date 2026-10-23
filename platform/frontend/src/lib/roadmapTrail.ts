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

export type RoadmapView = 'trilha' | 'cards'

export const ROADMAP_VIEWS: RoadmapView[] = ['trilha', 'cards']

const VIEW_KEY = 'devgrind.roadmap.view'

export function loadRoadmapView(storage: Pick<Storage, 'getItem'> | null): RoadmapView {
  try {
    const view = storage?.getItem(VIEW_KEY)
    return ROADMAP_VIEWS.includes(view as RoadmapView) ? (view as RoadmapView) : 'trilha'
  } catch {
    return 'trilha'
  }
}

export function saveRoadmapView(storage: Pick<Storage, 'setItem'> | null, view: RoadmapView): void {
  try {
    storage?.setItem(VIEW_KEY, view)
  } catch { /* storage is unavailable */ }
}

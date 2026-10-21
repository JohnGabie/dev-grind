import type { Course } from './courseModel'
import { courseProgress, orderCourses } from './courseProgress.ts'

export type ViewKey = 'cards' | 'lista' | 'grade' | 'galeria'
export type SortKey = 'default' | 'recent' | 'name' | 'progress'

export const VIEWS: ViewKey[] = ['cards', 'lista', 'grade', 'galeria']
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Padrão' },
  { key: 'recent', label: 'Mais recentes' },
  { key: 'name', label: 'Nome A-Z' },
  { key: 'progress', label: 'Progresso' },
]

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesQuery(item: { title: string; description?: string | null }, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true
  return normalizeText(item.title).includes(q) || normalizeText(item.description ?? '').includes(q)
}

function fractionDone(course: Course): number {
  const { done, total } = courseProgress(course)
  return total > 0 ? done / total : 0
}

const byTitle = (a: Course, b: Course) => a.title.localeCompare(b.title, 'pt', { sensitivity: 'base', numeric: true })

export function sortCourses<T extends Course>(courses: T[], key: SortKey): T[] {
  if (key === 'default') return orderCourses(courses)
  const indexed = courses.map((course, index) => ({ course, index }))
  indexed.sort((a, b) => {
    if (key === 'name') return byTitle(a.course, b.course) || a.index - b.index
    if (key === 'progress') return fractionDone(b.course) - fractionDone(a.course) || byTitle(a.course, b.course) || a.index - b.index
    const ca = a.course.created_at ?? ''
    const cb = b.course.created_at ?? ''
    if (ca !== cb) {
      if (!ca) return 1
      if (!cb) return -1
      return ca < cb ? 1 : -1
    }
    return a.index - b.index
  })
  return indexed.map(entry => entry.course)
}

export function visibleCourses<T extends Course>(courses: T[], query: string, key: SortKey): T[] {
  return sortCourses(courses.filter(course => matchesQuery(course, query)), key)
}

export interface CoursePrefs { view: ViewKey; sort: SortKey }
export const DEFAULT_PREFS: CoursePrefs = { view: 'cards', sort: 'default' }

const VIEW_KEY = 'devgrind.courses.view'
const SORT_KEY = 'devgrind.courses.sort'

export function loadPrefs(storage: Pick<Storage, 'getItem'> | null): CoursePrefs {
  try {
    const view = storage?.getItem(VIEW_KEY)
    const sort = storage?.getItem(SORT_KEY)
    return {
      view: VIEWS.includes(view as ViewKey) ? (view as ViewKey) : DEFAULT_PREFS.view,
      sort: SORTS.some(item => item.key === sort) ? (sort as SortKey) : DEFAULT_PREFS.sort,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: CoursePrefs): void {
  try {
    storage?.setItem(VIEW_KEY, prefs.view)
    storage?.setItem(SORT_KEY, prefs.sort)
  } catch { /* storage is unavailable */ }
}

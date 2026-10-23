import type { CourseState } from './courseProgress'
import type { ListEntry } from './listEntry'

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

function fractionDone(entry: ListEntry): number {
  return entry.total > 0 ? entry.done / entry.total : 0
}

const byTitle = (a: ListEntry, b: ListEntry) => a.title.localeCompare(b.title, 'pt', { sensitivity: 'base', numeric: true })

const GROUP: Record<CourseState, number> = { 'em andamento': 0, 'não iniciado': 1, 'concluído': 2 }

export function sortEntries<T extends ListEntry>(entries: T[], key: SortKey): T[] {
  const indexed = entries.map((entry, index) => ({ entry, index }))
  indexed.sort((a, b) => {
    if (key === 'default') {
      if (a.entry.kind === 'roadmap' || b.entry.kind === 'roadmap') return a.index - b.index
      return GROUP[a.entry.state] - GROUP[b.entry.state] || a.index - b.index
    }
    if (key === 'name') return byTitle(a.entry, b.entry) || a.index - b.index
    if (key === 'progress') return fractionDone(b.entry) - fractionDone(a.entry) || byTitle(a.entry, b.entry) || a.index - b.index
    const ca = a.entry.created_at ?? ''
    const cb = b.entry.created_at ?? ''
    if (ca !== cb) {
      if (!ca) return 1
      if (!cb) return -1
      return ca < cb ? 1 : -1
    }
    return a.index - b.index
  })
  return indexed.map(item => item.entry)
}

export function visibleEntries<T extends ListEntry>(entries: T[], query: string, key: SortKey): T[] {
  return sortEntries(entries.filter(entry => matchesQuery(entry, query)), key)
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

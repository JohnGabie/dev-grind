import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs, type CoursePrefs, type SortKey, type ViewKey } from '../lib/courseView'

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function useCoursePrefs() {
  const [prefs, setPrefs] = useState<CoursePrefs>(() => loadPrefs(storage()))
  const update = useCallback((next: CoursePrefs) => { setPrefs(next); savePrefs(storage(), next) }, [])
  return {
    prefs,
    setView: (view: ViewKey) => update({ ...prefs, view }),
    setSort: (sort: SortKey) => update({ ...prefs, sort }),
  }
}

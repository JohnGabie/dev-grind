import { useCallback, useState } from 'react'
import { loadRoadmapView, saveRoadmapView, type RoadmapView } from '../lib/roadmapTrail'

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function useRoadmapView() {
  const [view, setViewState] = useState<RoadmapView>(() => loadRoadmapView(storage()))
  const setView = useCallback((next: RoadmapView) => { setViewState(next); saveRoadmapView(storage(), next) }, [])
  return { view, setView }
}

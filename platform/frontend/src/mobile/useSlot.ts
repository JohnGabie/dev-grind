import { useCallback, useEffect, useState } from 'react'

export type SlotStatus = 'loading' | 'ready' | 'error'
export interface Slot<T> { status: SlotStatus; data: T | null; retry: () => void }

// `load` must be a stable reference (a module-level function).
export function useSlot<T>(load: () => Promise<T>): Slot<T> {
  const [state, setState] = useState<{ status: SlotStatus; data: T | null }>({ status: 'loading', data: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setState(s => ({ status: 'loading', data: s.data }))
    load()
      .then(data => { if (alive) setState({ status: 'ready', data }) })
      .catch(() => { if (alive) setState({ status: 'error', data: null }) })
    return () => { alive = false }
  }, [load, tick])

  const retry = useCallback(() => setTick(t => t + 1), [])
  return { ...state, retry }
}

import { useEffect, useState } from 'react'
import { keyboardHeight, nextBaseline, type Baseline } from '../lib/softKeyboard'

/**
 * Height of the soft keyboard in CSS px, 0 when it is closed.
 * With interactive-widget=resizes-content (index.html) the layout shrinks with
 * the keyboard, so innerHeight no longer shows it: the keyboard is the drop of
 * the visible height from the tallest one seen at this width.
 * Call it once per screen (the kata page, the lesson) and pass the value down.
 */
export function useSoftKeyboard(enabled: boolean): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !enabled) return
    let base: Baseline | null = null
    const measure = () => {
      const visible = vv.height * vv.scale
      base = nextBaseline(base, window.innerWidth, visible)
      setHeight(keyboardHeight(base, visible))
    }
    vv.addEventListener('resize', measure)
    measure()
    return () => vv.removeEventListener('resize', measure)
  }, [enabled])

  return enabled ? height : 0
}

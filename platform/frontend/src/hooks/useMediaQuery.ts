import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const MOBILE_QUERY = '(max-width: 768px)'

// Below this width the tabs, `sair do modo` and `apagar N` do not fit in one row (the pair needs about 470 px with two digits).
export const NARROW_QUERY = '(max-width: 479px)'

// A finger, not a mouse: the device that can show a soft keyboard.
export const TOUCH_QUERY = '(pointer: coarse)'

// Landscape: with the keyboard open a phone has about 100 px of page left.
export const LANDSCAPE_QUERY = '(orientation: landscape)'

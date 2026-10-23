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

// Below this width the tabs, `apagar N` and the close icon do not fit in one row (measured 361-370 px).
export const NARROW_QUERY = '(max-width: 374px)'

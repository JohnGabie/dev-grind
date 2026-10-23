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

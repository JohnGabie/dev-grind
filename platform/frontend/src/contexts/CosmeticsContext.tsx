import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/client'
import type { BgConfig } from '../components/StarfieldFooter'

type EquippedMap = Record<string, BgConfig>

interface CosmeticsCtx {
  equipped: EquippedMap
  bg: (slot: string) => BgConfig | null
  refresh: () => void
}

const CosmeticsContext = createContext<CosmeticsCtx>({
  equipped: {},
  bg: () => null,
  refresh: () => {},
})

export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const [equipped, setEquipped] = useState<EquippedMap>({})

  const load = useCallback(() => {
    api.get('/store/equipped')
      .then(r => setEquipped(r.data ?? {}))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const bg = (slot: string): BgConfig | null => equipped[slot] ?? null

  return (
    <CosmeticsContext.Provider value={{ equipped, bg, refresh: load }}>
      {children}
    </CosmeticsContext.Provider>
  )
}

export const useCosmetics = () => useContext(CosmeticsContext)

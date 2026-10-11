import { fetchStats } from '../api'
import { useSlot } from '../useSlot'

export function useProfileData() {
  return { stats: useSlot(fetchStats) }
}

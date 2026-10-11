import { fetchExercises, fetchInsights, fetchRecent, fetchResume, fetchStats } from '../api'
import { useSlot } from '../useSlot'

export function useDashboardData() {
  return {
    stats: useSlot(fetchStats),
    exercises: useSlot(fetchExercises),
    resume: useSlot(fetchResume),
    insights: useSlot(fetchInsights),
    recent: useSlot(fetchRecent),
  }
}

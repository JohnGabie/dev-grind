import type { HeatmapDay } from './heatmap'

export interface UserStats {
  user: { name: string; avatar_url: string | null; cover_url: string | null; bio: string | null; social_links: Record<string, string> }
  rank: string; rank_progress: number; honor: number; honor_for_next_rank: number
  total_completed: number; total_attempted: number; completion_rate: number
  current_streak: number; days_active: number; days_since_joined: number
  heatmap: Record<string, HeatmapDay>
  weekly_summary: { completed_last_7_days: number }
}
export interface Exercise { id: string; title: string; slug: string; difficulty: string }
export interface Resume {
  exercise: { title: string; slug: string; difficulty: string }
  passed_count: number; total_count: number; submitted_at: string | null
}
export interface Insight { message: string; generated_at: string; highlights: string[]; gaps: string[] }
export interface RecentExercise { id: string; title: string; slug: string; difficulty: string; status: string; submitted_at: string }

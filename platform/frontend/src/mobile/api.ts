import api from '../api/client'
import type { Exercise, Insight, RecentExercise, Resume, UserStats } from './types'

export const fetchStats = () => api.get('/users/me/stats').then(r => r.data as UserStats)
export const fetchExercises = () => api.get('/exercises/today').then(r => (r.data ?? []) as Exercise[])
export const fetchResume = () => api.get('/progress/resume').then(r => (r.data ?? null) as Resume | null).catch(() => null)
export const fetchInsights = () => api.get('/agent/insights').then(r => (r.data ?? []) as Insight[])
export const fetchRecent = () => api.get('/progress/recent-exercises').then(r => (r.data ?? []) as RecentExercise[])

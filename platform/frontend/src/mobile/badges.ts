import { BADGE_COLOR } from './palette.ts'

export interface BadgeStats {
  total_completed: number; current_streak: number; days_active: number
  honor: number; total_attempted: number; completion_rate: number
}
export interface BadgeDef {
  id: string; label: string; hint: string; svg: string; color: string
  cond: (s: BadgeStats) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first', label: 'Primeiro Passo', hint: 'complete 1 exercício', svg: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', cond: s => s.total_completed >= 1, color: BADGE_COLOR.orange },
  { id: 'five', label: 'Cadência', hint: 'complete 5 exercícios', svg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', cond: s => s.total_completed >= 5, color: BADGE_COLOR.yellow },
  { id: 'streak3', label: 'Chama', hint: '3 dias seguidos', svg: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z', cond: s => s.current_streak >= 3, color: BADGE_COLOR.red },
  { id: 'streak7', label: 'Incêndio', hint: '7 dias seguidos', svg: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M12 6v6l4 2', cond: s => s.current_streak >= 7, color: BADGE_COLOR.red },
  { id: 'active10', label: 'Constante', hint: '10 dias ativos', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5l6-6-1.4-1.4L11 13.2l-2.6-2.6L7 12l4 5z', cond: s => s.days_active >= 10, color: BADGE_COLOR.green },
  { id: 'honor30', label: 'Aprendiz', hint: '30 de honor', svg: 'M12 15l-4 5h8l-4-5zm0-13C8.1 2 5 5.1 5 9c0 3.9 7 13 7 13s7-9.1 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5z', cond: s => s.honor >= 30, color: BADGE_COLOR.blue },
  { id: 'honor120', label: 'Veterano', hint: '120 de honor', svg: 'M12 1l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z', cond: s => s.honor >= 120, color: BADGE_COLOR.purple },
  { id: 'sharpshooter', label: 'Preciso', hint: '5 tentativas com 80% de acerto', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm0-12a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z', cond: s => s.total_attempted >= 5 && s.completion_rate >= 0.8, color: BADGE_COLOR.cyan },
]

export function isUnlocked(def: BadgeDef, stats: BadgeStats): boolean {
  return def.cond(stats)
}

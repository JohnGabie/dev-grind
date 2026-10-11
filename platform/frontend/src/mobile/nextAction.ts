export interface ExerciseLite { title: string; slug: string; difficulty: string }
export interface ResumeLite { exercise: ExerciseLite; passed_count: number; total_count: number }
export type ModeKey = 'rankup' | 'warmup' | 'practice'
export interface NextAction {
  kind: 'resume' | 'start'
  slug: string; title: string; difficulty: string
  progress: string | null
}

export const MODE_LABEL: Record<ModeKey, string> = { rankup: 'Rank Up', warmup: 'Aquecimento', practice: 'Praticar' }

const ORDER: Record<string, number> = {
  '8kyu': 0, '7kyu': 1, '6kyu': 2, '5kyu': 3, '4kyu': 4, '3kyu': 5, '2kyu': 6, '1kyu': 7,
}

// hardest -> rankup, easiest -> warmup, middle -> practice (same rule as the desktop dashboard)
export function pickModes<T extends ExerciseLite>(exercises: T[]): Record<ModeKey, T | null> {
  if (exercises.length === 0) return { rankup: null, warmup: null, practice: null }
  const sorted = [...exercises].sort((a, b) => (ORDER[b.difficulty] ?? 0) - (ORDER[a.difficulty] ?? 0))
  return {
    rankup: sorted[0] ?? null,
    warmup: sorted[sorted.length - 1] ?? null,
    practice: sorted.length === 1 ? sorted[0] : sorted.length >= 2 ? sorted[1] : null,
  }
}

export function distinctModeCount(exercises: ExerciseLite[]): number {
  const modes = pickModes(exercises)
  return new Set(Object.values(modes).filter((e): e is ExerciseLite => e !== null).map(e => e.slug)).size
}

export function pickNextAction(resume: ResumeLite | null, exercises: ExerciseLite[], mode: ModeKey = 'rankup'): NextAction | null {
  if (resume && resume.total_count > 0 && resume.passed_count < resume.total_count) {
    const { slug, title, difficulty } = resume.exercise
    return { kind: 'resume', slug, title, difficulty, progress: `${resume.passed_count}/${resume.total_count} testes` }
  }
  const chosen = pickModes(exercises)[mode]
  if (!chosen) return null
  return { kind: 'start', slug: chosen.slug, title: chosen.title, difficulty: chosen.difficulty, progress: null }
}

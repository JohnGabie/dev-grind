export type FillPart =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; answer: string; size: 's' | 'm' | 'l' }

export type Step =
  | { type: 'text'; body: string }
  | { type: 'fill'; prompt: string; file: string; parts: FillPart[]; choices: string[] }
  | { type: 'browser'; prompt: string; starter: string }
  | { type: 'terminal'; prompt: string; expect: string }

export function asStep(raw: unknown): Step | null {
  const step = (raw ?? {}) as Record<string, unknown>
  const type = String(step.type ?? '')
  if (type === 'text') return { type, body: String(step.body ?? '') }
  if (type === 'fill') {
    const choices = Array.isArray(step.choices) ? step.choices.map(String) : []
    const file = String(step.file ?? 'index.html')
    const prompt = String(step.prompt ?? '')
    if (Array.isArray(step.parts)) {
      const parts: FillPart[] = []
      for (const rawPart of step.parts) {
        const part = (rawPart ?? {}) as Record<string, unknown>
        if (typeof part.text === 'string') parts.push({ kind: 'text', text: part.text })
        else if (typeof part.blank === 'string' || part.kind === 'blank') {
          const size = part.size === 's' || part.size === 'm' || part.size === 'l' ? part.size : 'm'
          parts.push({ kind: 'blank', answer: String(part.blank ?? part.answer ?? ''), size })
        }
      }
      if (parts.length) return { type, prompt, file, parts, choices }
    }
    return {
      type,
      prompt,
      file,
      choices,
      parts: [
        { kind: 'text', text: String(step.before ?? '') },
        { kind: 'blank', answer: String(step.answer ?? ''), size: 'l' },
        { kind: 'text', text: String(step.after ?? '') },
      ],
    }
  }
  if (type === 'browser') return { type, prompt: String(step.prompt ?? ''), starter: String(step.starter ?? '') }
  if (type === 'terminal') return { type, prompt: String(step.prompt ?? ''), expect: String(step.expect ?? '') }
  return null
}

export interface Lesson {
  title: string
  optional: boolean
  steps: Step[]
  sectionIndex: number
  lessonIndex: number
}

export interface Section {
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  description: string | null
  sections: Section[]
  completed: string[]
}

export function asCourse(row: Record<string, unknown>): Course | null {
  if (!Array.isArray(row.modules)) return null
  const sections: Section[] = []
  for (let sectionIndex = 0; sectionIndex < row.modules.length; sectionIndex++) {
    const section = (row.modules[sectionIndex] ?? {}) as Record<string, unknown>
    if (!Array.isArray(section.lessons)) continue
    const lessons: Lesson[] = []
    for (let lessonIndex = 0; lessonIndex < section.lessons.length; lessonIndex++) {
      const lesson = (section.lessons[lessonIndex] ?? {}) as Record<string, unknown>
      const steps = Array.isArray(lesson.steps) ? lesson.steps.map(asStep).filter((step): step is Step => step !== null) : []
      if (!steps.length) continue
      lessons.push({
        title: String(lesson.title ?? 'Lição'),
        optional: lesson.optional === true,
        steps,
        sectionIndex,
        lessonIndex,
      })
    }
    if (lessons.length) sections.push({ title: String(section.title ?? 'Seção'), lessons })
  }
  if (!sections.length) return null
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    sections,
    completed: Array.isArray(row.completed_lessons) ? row.completed_lessons.map(String) : [],
  }
}

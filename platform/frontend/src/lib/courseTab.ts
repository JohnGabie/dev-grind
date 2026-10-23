export type CourseTab = 'cursos' | 'roadmaps'

export function tabFromParam(value: string | null): CourseTab {
  return value === 'roadmaps' ? 'roadmaps' : 'cursos'
}

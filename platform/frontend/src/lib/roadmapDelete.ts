export function deleteCoursesNotice(count: number): string {
  if (count <= 0) return ''
  return count === 1
    ? '1 curso será apagado com todo o progresso'
    : `${count} cursos serão apagados com todo o progresso`
}

export function deleteRoadmapParams(deleteCourses: boolean): { delete_courses: true } | undefined {
  return deleteCourses ? { delete_courses: true } : undefined
}

const TITLES_SHOWN = 5

export function courseTitlesLine(titles: string[]): string {
  if (titles.length <= TITLES_SHOWN) return titles.join(', ')
  return `${titles.slice(0, TITLES_SHOWN).join(', ')} e mais ${titles.length - TITLES_SHOWN}`
}

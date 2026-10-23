export function deleteCoursesNotice(count: number): string {
  if (count <= 0) return ''
  return count === 1
    ? '1 curso será apagado com todo o progresso'
    : `${count} cursos serão apagados com todo o progresso`
}

export function deleteRoadmapParams(deleteCourses: boolean): { delete_courses: true } | undefined {
  return deleteCourses ? { delete_courses: true } : undefined
}

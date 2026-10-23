import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { asCourse, type Course } from '../lib/courseModel'
import { asRoadmap, type Roadmap } from '../lib/roadmapModel'

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>([])
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [error, setError] = useState<string | null>(null)
  const [roadmapsError, setRoadmapsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const coursesRequest = api.get('/courses')
      .then(r => {
        const rows = Array.isArray(r.data) ? r.data as Record<string, unknown>[] : []
        if (!cancelled) setCourses(rows.map(asCourse).filter((course): course is Course => course !== null))
      })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar os cursos.') })
    const roadmapsRequest = api.get('/roadmaps')
      .then(r => {
        const rows: unknown[] = Array.isArray(r.data) ? r.data : []
        if (!cancelled) setRoadmaps(rows.map(asRoadmap).filter((roadmap): roadmap is Roadmap => roadmap !== null))
      })
      .catch(() => { if (!cancelled) setRoadmapsError('Não foi possível carregar os roadmaps.') })
    Promise.all([coursesRequest, roadmapsRequest]).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  const reload = useCallback(() => {
    setError(null)
    setRoadmapsError(null)
    setLoading(true)
    setReloadKey(key => key + 1)
  }, [])

  const byId = useMemo(() => new Map(courses.map(course => [course.id, course])), [courses])

  return { courses, setCourses, roadmaps, byId, loading, error, roadmapsError, reload }
}

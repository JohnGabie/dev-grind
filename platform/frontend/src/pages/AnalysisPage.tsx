import { Navigate } from 'react-router-dom'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import AnalysisMobile from '../mobile/analysis/AnalysisMobile'

export default function AnalysisPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return isMobile ? <AnalysisMobile /> : <Navigate to="/" replace />
}

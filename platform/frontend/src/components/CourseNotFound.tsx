import { Link } from 'react-router-dom'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

export default function CourseNotFound({ text, to, linkText }: { text: string; to: string; linkText: string }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return (
    <div role="status">
      <p style={{ color: 'var(--muted)', fontSize: isMobile ? 'var(--fs-base)' : undefined }}>{text}</p>
      <Link to={to} style={{ color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', minHeight: isMobile ? 'var(--ctl-md)' : undefined, fontSize: isMobile ? 'var(--fs-base)' : undefined }}>
        {linkText}
      </Link>
    </div>
  )
}

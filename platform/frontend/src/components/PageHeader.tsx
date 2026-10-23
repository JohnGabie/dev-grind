import type { ReactNode } from 'react'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

export default function PageHeader({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return (
    <div className="fade-up" style={{ marginBottom: isMobile ? 20 : 32 }}>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em' }}>
        {eyebrow}
      </p>
      <h1 style={{ fontSize: isMobile ? 'var(--fs-xl)' : 40, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
        {title}
      </h1>
      <p style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: 'var(--muted)', margin: 0, maxWidth: 500, lineHeight: 1.7 }}>
        {description}
      </p>
      {children && <div style={{ marginTop: 20 }}>{children}</div>}
    </div>
  )
}

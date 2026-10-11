import type { ReactNode } from 'react'
import { pagePadding } from '../lib/layout'

interface MobilePageProps {
  children: ReactNode
  header?: ReactNode        // full-bleed block above the padded content (the Profile cover)
  background?: ReactNode    // decoration behind the content (store cosmetic)
}

export default function MobilePage({ children, header, background }: MobilePageProps) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      {background && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {background}
        </div>
      )}
      <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
        {header}
        <div style={{ padding: pagePadding(header ? '20px 0 88px' : '0 0 88px', true, !header), fontFamily: 'var(--font)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

export default function Readout({ children }: { children: ReactNode }) {
  return (
    <div role="status" style={{
      minHeight: 'var(--ctl-md)', display: 'flex', alignItems: 'center',
      fontSize: 'var(--fs-sm)', color: 'var(--muted)', fontFamily: 'var(--font)',
    }}>
      {children}
    </div>
  )
}

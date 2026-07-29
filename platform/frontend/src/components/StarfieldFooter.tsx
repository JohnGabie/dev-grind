import { useMemo } from 'react'

export interface BgConfig {
  type: 'starfield' | 'matrix' | 'rain' | 'aurora' | 'midnight-sky' | 'radial-burst' | 'neon-grid'
  color1?: string
  color2?: string
  color3?: string
  density?: number
  speed?: number
}

export type StarfieldConfig = BgConfig & { type: 'starfield' }

export const DEFAULT_SF: BgConfig = {
  type: 'starfield',
  color1: 'rgba(255,255,255,0.35)',
  color2: 'rgba(255,255,255,0.55)',
  color3: 'rgba(255,255,255,0.85)',
  density: 1,
  speed: 1,
}

function makeShadows(n: number, color: string): string {
  const s: string[] = []
  for (let i = 0; i < n; i++)
    s.push(`${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px ${color}`)
  return s.join(', ')
}

function StarLayer({ shadows, size, duration }: { shadows: string; size: number; duration: number }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: size, height: size,
    background: 'transparent',
    boxShadow: shadows,
    animation: `animStar ${duration}s linear infinite`,
  }
  // A classe existe para o guard de prefers-reduced-motion alcançar a animação,
  // que é inline e por isso só cede a um !important com seletor.
  return (
    <>
      <div className="bp-star" style={style} />
      <div className="bp-star" style={{ ...style, top: 2000 }} />
    </>
  )
}

// Full-screen background overlay — position parent as relative
export function StarfieldBg({ config }: { config?: BgConfig | null }) {
  const cfg = { ...DEFAULT_SF, ...config }
  const d = cfg.density ?? 1
  const sp = cfg.speed ?? 1

  const shadows = useMemo(() => ({
    s1: makeShadows(Math.floor(700 * d), cfg.color1!),
    s2: makeShadows(Math.floor(200 * d), cfg.color2!),
    s3: makeShadows(Math.floor(80 * d), cfg.color3!),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cfg.color1, cfg.color2, cfg.color3, d])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <StarLayer shadows={shadows.s1} size={1} duration={50 / sp} />
      <StarLayer shadows={shadows.s2} size={2} duration={100 / sp} />
      <StarLayer shadows={shadows.s3} size={3} duration={150 / sp} />
    </div>
  )
}

// Miniature preview for store cards — lower density to keep it light
export function StarfieldPreview({ config }: { config?: BgConfig | null }) {
  const cfg = { ...DEFAULT_SF, ...config }
  const d = (cfg.density ?? 1) * 0.25
  const sp = cfg.speed ?? 1

  const shadows = useMemo(() => ({
    s1: makeShadows(Math.floor(700 * d), cfg.color1!),
    s2: makeShadows(Math.floor(200 * d), cfg.color2!),
    s3: makeShadows(Math.floor(80 * d), cfg.color3!),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cfg.color1, cfg.color2, cfg.color3, d])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit' }}>
      <StarLayer shadows={shadows.s1} size={1} duration={50 / sp} />
      <StarLayer shadows={shadows.s2} size={2} duration={100 / sp} />
      <StarLayer shadows={shadows.s3} size={3} duration={150 / sp} />
    </div>
  )
}

// Footer banner variant (backward compat for DashboardPage)
export default function StarfieldFooter({ height = 220, config }: { height?: number; config?: BgConfig | null }) {
  return (
    <div style={{
      position: 'relative',
      height,
      overflow: 'hidden',
      flexShrink: 0,
      background: 'linear-gradient(to top, rgba(13,26,42,0.5) 0%, rgba(13,26,42,0.15) 60%, transparent 100%)',
    }}>
      <StarfieldBg config={config} />
    </div>
  )
}

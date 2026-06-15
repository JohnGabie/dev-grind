import type { BgConfig } from './StarfieldFooter'
import { StarfieldBg, StarfieldPreview, DEFAULT_SF } from './StarfieldFooter'
import { MatrixBg, RainBg, AuroraBg, MidnightSkyBg, RadialBurstBg, NeonGridBg } from './BackgroundPatterns'

export function BackgroundBg({ config }: { config?: BgConfig | null }) {
  const c = config ?? DEFAULT_SF
  switch (c.type) {
    case 'matrix':      return <MatrixBg color1={c.color1} color2={c.color2} color3={c.color3} speed={c.speed} />
    case 'rain':        return <RainBg color1={c.color1} speed={c.speed} />
    case 'aurora':      return <AuroraBg color1={c.color1} color2={c.color2} color3={c.color3} />
    case 'midnight-sky':return <MidnightSkyBg color1={c.color1} />
    case 'radial-burst':return <RadialBurstBg color1={c.color1} color2={c.color2} color3={c.color3} />
    case 'neon-grid':   return <NeonGridBg color1={c.color1} color2={c.color2} color3={c.color3} />
    default:            return <StarfieldBg config={c} />
  }
}

export function BackgroundPreview({ config }: { config?: BgConfig | null }) {
  const c = config ?? DEFAULT_SF
  switch (c.type) {
    case 'matrix':      return <MatrixBg color1={c.color1} color2={c.color2} color3={c.color3} speed={c.speed} preview />
    case 'rain':        return <RainBg color1={c.color1} />
    case 'aurora':      return <AuroraBg color1={c.color1} color2={c.color2} color3={c.color3} />
    case 'midnight-sky':return <MidnightSkyBg color1={c.color1} />
    case 'radial-burst':return <RadialBurstBg color1={c.color1} color2={c.color2} color3={c.color3} />
    case 'neon-grid':   return <NeonGridBg color1={c.color1} color2={c.color2} color3={c.color3} />
    default:            return <StarfieldPreview config={c} />
  }
}

export function BackgroundFooter({ height = 220, config }: { height?: number; config?: BgConfig | null }) {
  return (
    <div style={{
      position: 'relative', height, overflow: 'hidden', flexShrink: 0,
      background: 'linear-gradient(to top, rgba(13,26,42,0.5) 0%, rgba(13,26,42,0.15) 60%, transparent 100%)',
    }}>
      <BackgroundBg config={config} />
    </div>
  )
}

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const DESKTOP: Record<string, string> = {
  '--fs-xs': '10px', '--fs-sm': '11px', '--fs-base': '13px', '--fs-input': '13px', '--fs-lg': '15px', '--fs-xl': '22px',
  '--lh-xs': '1.3', '--lh-sm': '1.5', '--lh-base': '1.6', '--lh-input': '1.4', '--lh-lg': '1.35', '--lh-xl': '1.25',
  '--sp-1': '4px', '--sp-2': '8px', '--sp-3': '12px', '--sp-4': '16px', '--sp-5': '20px', '--sp-6': '24px', '--sp-7': '32px',
  '--ctl-primary': '40px', '--ctl-md': '32px', '--ctl-chip': '28px', '--ctl-icon': '32px', '--ctl-row': '44px', '--ctl-tag': '18px',
  '--radius-sm': '4px', '--radius-md': '6px', '--radius-lg': '8px', '--radius-pill': '999px',
  '--icon-sm': '16px', '--icon-md': '20px',
}

const MOBILE_CHANGES: Record<string, string> = {
  '--fs-xs': '11px', '--fs-sm': '12px', '--fs-base': '14px', '--fs-input': '16px', '--fs-lg': '17px',
  '--ctl-primary': '48px', '--ctl-md': '44px', '--ctl-chip': '36px', '--ctl-icon': '44px', '--ctl-row': '52px', '--ctl-tag': '20px',
  '--radius-md': '8px', '--radius-lg': '12px',
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function rootBlocks(): { desktop: Record<string, string>; mobile: Record<string, string> } {
  const media = css.match(/@media \(max-width: 768px\) \{\s*:root \{([^}]*)\}/)
  assert.ok(media, 'mobile :root block inside @media (max-width: 768px) is missing')
  const withoutMedia = css.replace(media[0], '')
  const desktopBlocks = [...withoutMedia.matchAll(/:root \{([^}]*)\}/g)].map(m => declarations(m[1]))
  return { desktop: Object.assign({}, ...desktopBlocks), mobile: declarations(media[1]) }
}

describe('mobile ui scale tokens', () => {
  const { desktop, mobile } = rootBlocks()

  it('defines every token with its desktop value', () => {
    for (const [name, value] of Object.entries(DESKTOP)) assert.equal(desktop[name], value, name)
  })

  it('redefines exactly the tokens that change on mobile', () => {
    assert.deepEqual(mobile, MOBILE_CHANGES)
  })
})

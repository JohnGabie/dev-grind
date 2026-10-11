import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

const files = readdirSync(ROOT, { recursive: true, encoding: 'utf8' })
  .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f))
  .map(f => ({ name: f.replace(/\\/g, '/'), text: readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n') }))

// João keeps the cover look on the mobile Profile identity block.
const COVER_EXCEPTION = 'profile/IdentitySection.tsx'

describe('src/mobile contract', () => {
  it('has the building blocks', () => {
    for (const name of ['MobilePage', 'Section', 'Surface', 'Stat', 'RankCard', 'WindowFrame', 'PromptLine', 'ListRow', 'Readout', 'SectionState']) {
      assert.ok(files.some(f => f.name === `${name}.tsx`), `${name}.tsx is missing`)
    }
  })
  it('uses no raw font sizes', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /fontSize:\s*['"]?\d/, `${f.name} has a raw fontSize`)
    }
  })
  it('renders no mock data and no emoji', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /MOCK_/, `${f.name} references mock data`)
      assert.doesNotMatch(f.text, /\p{Extended_Pictographic}/u, `${f.name} has an emoji`)
    }
  })
  it('does not import desktop pages', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /from\s+['"][./]+\/pages\//, `${f.name} imports a page`)
    }
  })
  it('has no glow, blur or gradient outside the cover exception', () => {
    for (const f of files.filter(x => x.name !== COVER_EXCEPTION)) {
      assert.doesNotMatch(f.text, /textShadow|backdropFilter|WebkitBackdropFilter|boxShadow|linear-gradient|radial-gradient|conic-gradient|filter:\s*['"`]?\s*blur/i, `${f.name} has decoration`)
    }
  })
  it('keeps hex colours inside palette.ts and rank.ts', () => {
    for (const f of files.filter(x => x.name !== COVER_EXCEPTION && x.name !== 'palette.ts' && x.name !== 'rank.ts')) {
      assert.doesNotMatch(f.text, /#[0-9a-fA-F]{3,8}\b/, `${f.name} has a hex colour`)
    }
  })
  it('keeps long titles from breaking the layout', () => {
    for (const name of ['ListRow.tsx', 'dashboard/NextActionSection.tsx']) {
      const f = files.find(x => x.name === name)
      assert.ok(f, `${name} is missing`)
      assert.match(f.text, /textOverflow:\s*'ellipsis'/, `${name} must ellipsize its title`)
    }
  })
})

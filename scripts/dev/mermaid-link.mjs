import { deflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const code = readFileSync(0, 'utf8').trim()
if (!code) {
  console.error('usage: node scripts/dev/mermaid-link.mjs < diagram.mmd')
  process.exit(1)
}
const state = JSON.stringify({ code, mermaid: JSON.stringify({ theme: 'default' }), autoSync: true, updateDiagram: true })
const link = 'https://mermaid.live/view#pako:' + deflateSync(Buffer.from(state), { level: 9 }).toString('base64url')
const copy = { win32: 'clip', darwin: 'pbcopy' }[process.platform]
if (!copy) {
  console.log(link)
  process.exit(0)
}
execSync(copy, { input: link })
console.log(`link copied (${link.length} chars)`)

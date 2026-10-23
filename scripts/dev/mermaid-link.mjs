import { deflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

const code = readFileSync(0, 'utf8').trim()
if (!code) {
  console.error('usage: node scripts/dev/mermaid-link.mjs < diagram.mmd')
  process.exit(1)
}
const state = JSON.stringify({ code, mermaid: JSON.stringify({ theme: 'default' }), autoSync: true, updateDiagram: true })
console.log('https://mermaid.live/view#pako:' + deflateSync(Buffer.from(state), { level: 9 }).toString('base64url'))

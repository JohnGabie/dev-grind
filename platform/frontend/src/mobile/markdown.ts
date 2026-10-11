export type MarkdownKind = 'heading' | 'marker' | 'bold' | 'code' | 'text'
export interface MarkdownToken { text: string; kind: MarkdownKind }

export const MARKDOWN_COLOR: Record<MarkdownKind, string> = {
  heading: 'var(--blue)', marker: 'var(--orange)', bold: 'var(--yellow)', code: 'var(--cyan)', text: 'var(--text)',
}

const SPAN = /\*\*[^*]+\*\*|`[^`]+`/g

function inline(text: string): MarkdownToken[] {
  const out: MarkdownToken[] = []
  let last = 0
  for (const m of text.matchAll(SPAN)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), kind: 'text' })
    out.push({ text: m[0], kind: m[0].startsWith('`') ? 'code' : 'bold' })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), kind: 'text' })
  return out
}

export function tokenizeMarkdownLine(line: string): MarkdownToken[] {
  if (/^#{1,2}(\s|$)/.test(line)) return [{ text: line, kind: 'heading' }]
  const item = /^(\s*- )/.exec(line)
  if (item) return [{ text: item[1], kind: 'marker' }, ...inline(line.slice(item[1].length))]
  return inline(line)
}

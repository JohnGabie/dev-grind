import test from 'node:test'
import assert from 'node:assert/strict'
import { tokenizeMarkdownLine } from './markdown.ts'

const joined = (line: string) => tokenizeMarkdownLine(line).map(t => t.text).join('')

test('headings colour the whole line', () => {
  assert.deepEqual(tokenizeMarkdownLine('# 11 out'), [{ text: '# 11 out', kind: 'heading' }])
  assert.deepEqual(tokenizeMarkdownLine('## lacunas'), [{ text: '## lacunas', kind: 'heading' }])
})

test('list item splits marker from the rest', () => {
  assert.deepEqual(tokenizeMarkdownLine('- joins'), [{ text: '- ', kind: 'marker' }, { text: 'joins', kind: 'text' }])
  assert.deepEqual(tokenizeMarkdownLine('- a **b**').map(t => t.kind), ['marker', 'text', 'bold'])
})

test('bold and code spans', () => {
  assert.deepEqual(tokenizeMarkdownLine('a **b** `c` d'), [
    { text: 'a ', kind: 'text' }, { text: '**b**', kind: 'bold' }, { text: ' ', kind: 'text' },
    { text: '`c`', kind: 'code' }, { text: ' d', kind: 'text' },
  ])
})

test('unmatched markers stay text', () => {
  assert.deepEqual(tokenizeMarkdownLine('a **b'), [{ text: 'a **b', kind: 'text' }])
})

test('concatenated tokens equal the input', () => {
  for (const line of ['', '# x', '## y z', '- item', '  - nested **b**', '---', 'a **b', '**', '`', 'x `y` **z** - w', '#nospace', '-no']) {
    assert.equal(joined(line), line, JSON.stringify(line))
  }
})

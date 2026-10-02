import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('SkillPath source', () => {
  it('paints the spec markers and does not invent a second path', () => {
    const source = readFileSync(join(here, 'SkillPath.tsx'), 'utf8')
    assert.match(source, /placeSkillPath/)
    assert.equal(source.includes('mainLanes'), false)
    assert.equal(source.includes('Math.random'), false)
    assert.equal(source.includes('dangerouslySetInnerHTML'), false)
    assert.equal(source.includes('foreignObject'), false)
    assert.equal(source.includes('className="card"'), false)
    assert.equal(source.includes('className={"card"}'), false)
    assert.match(source, /aria-current/)
    assert.match(source, /opcional/)
    assert.match(source, /13 2 4 14 12 14 11 22 20 10 12 10 13 2/)
    assert.match(source, /20 6 9 17 4 12/)
    assert.match(source, /aria-label="feita"/)
    assert.match(source, /radial-gradient\(circle, var\(--border\) 1\.2px, transparent 1\.4px\)/)
    assert.match(source, /overflowX: 'auto'/)
  })

  it('removes the numbered lesson list and still raises the chat only for an open lesson', () => {
    const page = readFileSync(join(here, '../pages/CoursesPage.tsx'), 'utf8')
    assert.equal(page.includes('padStart'), false)
    assert.match(page, /<SkillPath/)
    assert.match(page, /item\.sectionIndex}-\$\{item\.lessonIndex\}/)
    assert.match(page, /dataset\.courseLesson/)
    assert.match(page, /de \{item\.sections\.reduce/)
  })
})

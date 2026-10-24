/**
 * Enter in a fill blank: move to the next empty blank after this one.
 * On the last blank, or when every later blank is filled, Enter verifies.
 */

export type EnterResult = { kind: 'focus'; index: number } | { kind: 'verify' }

export function enterInBlank(blanks: readonly string[], index: number): EnterResult {
  for (let next = index + 1; next < blanks.length; next += 1) {
    if (blanks[next] === '') return { kind: 'focus', index: next }
  }
  return { kind: 'verify' }
}

export function enterKeyHintFor(blanks: readonly string[], index: number): 'next' | 'go' {
  return enterInBlank(blanks, index).kind === 'verify' ? 'go' : 'next'
}

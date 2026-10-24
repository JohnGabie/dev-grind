export type ResultSummary = { passedCount: number; totalCount: number; allPassed: boolean }

/** A run passes when every case passed. An empty suite passes (0 === 0): the
 *  page always behaved this way and the Part 5 spec keeps it. */
export function summarizeResults(results: readonly { passed: boolean }[] | null): ResultSummary {
  if (!results) return { passedCount: 0, totalCount: 0, allPassed: false }
  const passedCount = results.filter(r => r.passed).length
  return { passedCount, totalCount: results.length, allPassed: passedCount === results.length }
}

export function hiddenCasesNote(count: number, when: string): string {
  const s = count !== 1 ? 's' : ''
  return `+ ${count} caso${s} oculto${s} — revelados ${when}`
}

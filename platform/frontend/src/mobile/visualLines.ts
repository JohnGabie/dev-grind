export function visualLineCounts(heights: number[], lineHeight: number): number[] {
  return heights.map(h => (lineHeight > 0 && h > 0 ? Math.max(1, Math.round(h / lineHeight)) : 1))
}

export function totalVisualLines(counts: number[]): number {
  return counts.reduce((sum, n) => sum + n, 0)
}

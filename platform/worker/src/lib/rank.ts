export const RANK_THRESHOLDS: [number, string][] = [
  [0, '8kyu'], [30, '7kyu'], [120, '6kyu'],
  [400, '5kyu'], [1200, '4kyu'], [4000, '3kyu'],
]

export function honorToRank(honor: number): string {
  let rank = '8kyu'
  for (const [threshold, name] of RANK_THRESHOLDS) {
    if (honor >= threshold) rank = name
  }
  return rank
}

export function rankProgress(honor: number): number {
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (i + 1 < RANK_THRESHOLDS.length) {
      const [cur] = RANK_THRESHOLDS[i]
      const [next] = RANK_THRESHOLDS[i + 1]
      if (honor < next) return (honor - cur) / (next - cur)
    }
  }
  return 1.0
}

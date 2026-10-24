/**
 * Soft keyboard detection from the visible height (visualViewport).
 * With `interactive-widget=resizes-content` the layout shrinks with the visible
 * area, so `innerHeight - visualViewport.height` is always 0. The keyboard is the
 * drop from the tallest visible height seen at the same width.
 */

/** Smallest drop read as a keyboard. Above the Firefox toolbar (64 px), below a landscape keyboard (about 190 px). */
export const KEYBOARD_MIN_DROP = 120

export type Baseline = { width: number; height: number }

export function nextBaseline(baseline: Baseline | null, width: number, height: number): Baseline {
  if (!baseline || baseline.width !== width) return { width, height }
  return { width, height: Math.max(baseline.height, height) }
}

export function keyboardHeight(baseline: Baseline | null, height: number): number {
  if (!baseline) return 0
  const drop = Math.round(baseline.height - height)
  return drop >= KEYBOARD_MIN_DROP ? drop : 0
}

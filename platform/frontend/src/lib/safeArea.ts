/**
 * Bottom safe area for every bottom padding and the dock. Firefox for Android (158) reports the
 * navigation bar as `safe-area-inset-bottom` (48px) although the page ends above that bar, so the
 * dock floated 48px too high. `--safe-bottom` holds the corrected value; browsers that do not
 * expose the viewport position on screen (Safari, Chrome) keep `env()`.
 */
export const SAFE_BOTTOM = 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))'

const MIN_INSET = 1

/** The part of the inset that lies inside the viewport: the inset minus the screen strip below the viewport. */
export function effectiveBottomInset({ inset, screenHeight, viewportTop, viewportHeight }: {
  inset: number
  screenHeight: number
  viewportTop: number | undefined
  viewportHeight: number
}): number {
  if (viewportTop === undefined) return inset
  const below = Math.max(0, screenHeight - (viewportTop + viewportHeight))
  const inside = inset - below
  return inside < MIN_INSET ? 0 : Math.round(inside * 10) / 10
}

/** Keeps `--safe-bottom` on <html> in step with the viewport. Only Gecko exposes `mozInnerScreenY`. */
export function watchSafeBottom(): void {
  const top = (window as Window & { mozInnerScreenY?: number }).mozInnerScreenY
  if (typeof top !== 'number') return
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom, 0px)'
  document.body.appendChild(probe)
  const sync = () => {
    const inset = effectiveBottomInset({
      inset: parseFloat(getComputedStyle(probe).paddingBottom) || 0,
      screenHeight: screen.height,
      viewportTop: (window as Window & { mozInnerScreenY?: number }).mozInnerScreenY,
      viewportHeight: window.innerHeight,
    })
    document.documentElement.style.setProperty('--safe-bottom', `${inset}px`)
  }
  sync()
  window.addEventListener('resize', sync)
  window.visualViewport?.addEventListener('resize', sync)
}

export const MOBILE_GUTTER = 16

/**
 * Troca o gutter lateral de desktop pelo de mobile, preservando o vertical.
 * Função pura de propósito: várias páginas têm `return` antecipado antes do
 * padding, e um hook chamado depois disso quebraria a ordem dos hooks.
 */
export function pagePadding(desktop: string, isMobile: boolean): string {
  if (!isMobile) return desktop

  const p = desktop.trim().split(/\s+/)
  const g = `${MOBILE_GUTTER}px`

  switch (p.length) {
    case 1: return `${p[0]} ${g}`
    case 2: return `${p[0]} ${g}`
    case 3: return `${p[0]} ${g} ${p[2]}`
    default: return `${p[0]} ${g} ${p[2]} ${g}`
  }
}

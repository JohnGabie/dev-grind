/** Margem lateral das páginas no mobile. 16 deixava o conteúdo colado na borda. */
export const MOBILE_GUTTER = 20

/**
 * Altura do TopBar. Só existe no desktop: no mobile o perfil abre pela folha
 * "Mais" da dock, então não há faixa reservada no topo.
 */
export const TOPBAR_HEIGHT = 54

/** Altura do TopBar somada ao inset do topo. Só o desktop usa. */
export const TOPBAR_SPACE = `calc(${TOPBAR_HEIGHT}px + env(safe-area-inset-top, 0px))`

/**
 * No mobile o topo é só o inset. O index.html usa `viewport-fit=cover` com
 * status bar translúcida, então no PWA instalado a página começa embaixo do
 * relógio — sem isso a status bar cairia em cima do conteúdo.
 */
export const MOBILE_TOP_INSET = 'env(safe-area-inset-top, 0px)'

/** Respiro entre o topo (inset) e o conteúdo das páginas que abrem direto nele. */
const MOBILE_TOP_GAP = MOBILE_GUTTER

/** Geometria da dock. Vive aqui, e não no MobileNav, porque o padding das
 *  páginas depende dela — deixar nos dois lugares é garantir que divirjam. */
export const DOCK_HEIGHT = 60
export const DOCK_GAP = 14
export const DOCK_SIDE_INSET = MOBILE_GUTTER

/** Altura da dock, o respiro até a borda e o home indicator do iPhone. */
export const MOBILE_NAV_SPACE =
  `calc(${DOCK_HEIGHT + DOCK_GAP}px + env(safe-area-inset-bottom, 0px))`

/**
 * Troca o gutter lateral de desktop pelo de mobile, preservando o vertical.
 * Função pura de propósito: várias páginas têm `return` antecipado antes do
 * padding, e um hook chamado depois disso quebraria a ordem dos hooks.
 *
 * `absorbTopBar` é para quem chama isso no container mais externo da página:
 * troca o padding-top de desktop pelo respiro do mobile mais o inset do topo.
 * Quem tem header próprio (Exercise, BookReader, Chat) deixa em false: a faixa
 * empurra o header inteiro, e o padding interno continua sendo a distância
 * entre esse header e o texto.
 *
 * Os espaços do TopBar e da dock entram no padding do conteúdo, e não numa
 * moldura mais externa: assim o fundo da página alcança as duas bordas e passa
 * atrás das barras, em vez de parar antes delas e deixar uma faixa preta em
 * volta de cada uma.
 */
export function pagePadding(desktop: string, isMobile: boolean, absorbTopBar = false, reserveDock = true): string {
  if (!isMobile) return desktop

  const p = desktop.trim().split(/\s+/)
  const g = `${MOBILE_GUTTER}px`
  const t = absorbTopBar ? `calc(${MOBILE_TOP_GAP}px + ${MOBILE_TOP_INSET})` : p[0]
  const bottomBase = p.length >= 3 ? p[2] : p[0]
  const b = `calc(${bottomBase} + ${reserveDock ? MOBILE_NAV_SPACE : 'env(safe-area-inset-bottom, 0px)'})`

  switch (p.length) {
    case 1:
    case 2:  return `${t} ${g} ${b}`
    case 3:  return `${t} ${g} ${b}`
    default: return `${t} ${g} ${b} ${g}`
  }
}

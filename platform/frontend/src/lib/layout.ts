export const MOBILE_GUTTER = 16

/**
 * Altura do TopBar. No mobile ele mede 201px de largura ancorado à direita, o
 * que deixa só 189px livres num viewport de 390 — pouco para caber um header de
 * página ao lado. Então a faixa inteira é dele, e o conteúdo começa abaixo.
 */
export const TOPBAR_HEIGHT = 54

/**
 * Altura do TopBar somada ao inset do topo. O index.html usa `viewport-fit=cover`
 * com status bar translúcida, então no PWA instalado a página começa embaixo do
 * relógio — sem isso a status bar cairia em cima do badge de kyu.
 */
export const TOPBAR_SPACE = `calc(${TOPBAR_HEIGHT}px + env(safe-area-inset-top, 0px))`

/**
 * Respiro entre a faixa do TopBar e o conteúdo. Substitui o padding-top de
 * desktop nas páginas que abrem direto com conteúdo — a faixa já afasta do
 * topo, e somar os dois abriria um vão morto de quase 100px.
 */
const MOBILE_TOP_GAP = 12

/** Geometria da dock. Vive aqui, e não no MobileNav, porque o padding das
 *  páginas depende dela — deixar nos dois lugares é garantir que divirjam. */
export const DOCK_HEIGHT = 60
export const DOCK_GAP = 14
export const DOCK_SIDE_INSET = 12

/** Altura da dock, o respiro até a borda e o home indicator do iPhone. */
export const MOBILE_NAV_SPACE =
  `calc(${DOCK_HEIGHT + DOCK_GAP}px + env(safe-area-inset-bottom, 0px))`

/**
 * Troca o gutter lateral de desktop pelo de mobile, preservando o vertical.
 * Função pura de propósito: várias páginas têm `return` antecipado antes do
 * padding, e um hook chamado depois disso quebraria a ordem dos hooks.
 *
 * `absorbTopBar` é para quem chama isso no container mais externo da página.
 * Quem tem header próprio (Exercise, BookReader, Chat) deixa em false: a faixa
 * empurra o header inteiro, e o padding interno continua sendo a distância
 * entre esse header e o texto.
 *
 * Os espaços do TopBar e da dock entram no padding do conteúdo, e não numa
 * moldura mais externa: assim o fundo da página alcança as duas bordas e passa
 * atrás das barras, em vez de parar antes delas e deixar uma faixa preta em
 * volta de cada uma.
 */
export function pagePadding(desktop: string, isMobile: boolean, absorbTopBar = false): string {
  if (!isMobile) return desktop

  const p = desktop.trim().split(/\s+/)
  const g = `${MOBILE_GUTTER}px`
  const t = absorbTopBar ? `calc(${MOBILE_TOP_GAP}px + ${TOPBAR_SPACE})` : p[0]
  const bottomBase = p.length >= 3 ? p[2] : p[0]
  const b = `calc(${bottomBase} + ${MOBILE_NAV_SPACE})`

  switch (p.length) {
    case 1:
    case 2:  return `${t} ${g} ${b}`
    case 3:  return `${t} ${g} ${b}`
    default: return `${t} ${g} ${b} ${g}`
  }
}

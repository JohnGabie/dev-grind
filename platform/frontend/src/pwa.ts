const UMA_HORA = 60 * 60 * 1000

/**
 * Registra o service worker de public/sw.js.
 *
 * O SW usa skipWaiting + clients.claim, então a versão nova assume assim que
 * é baixada. O controllerchange abaixo recarrega a página nesse instante — é
 * o que faz uma atualização do frontend chegar sem reinstalar o app.
 */
export function setupPWA() {
  if (!('serviceWorker' in navigator)) return
  // Contexto inseguro (http em host que não seja localhost) não registra SW.
  if (!window.isSecureContext) return

  window.addEventListener('load', async () => {
    try {
      const jaControlada = !!navigator.serviceWorker.controller
      const registration = await navigator.serviceWorker.register('/sw.js')

      let recarregando = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Na primeira visita o SW assume uma página que ainda não tinha
        // controlador; recarregar ali seria um reload à toa.
        if (recarregando || !jaControlada) return
        recarregando = true
        window.location.reload()
      })

      // O app instalado pode ficar aberto por dias sem um load novo; sem isso
      // o browser só checaria por conta própria a cada 24h.
      setInterval(() => {
        if (navigator.onLine) registration.update()
      }, UMA_HORA)
    } catch {
      // SW é progressive enhancement: se falhar, o app funciona igual.
    }
  })
}

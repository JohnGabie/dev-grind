// Service worker da DevGrind. Escrito à mão de propósito — o que este app
// precisa é ser instalável e trocar de versão sozinho, e isso cabe aqui.
//
// Bump CACHE a cada mudança nas regras abaixo; os caches antigos são apagados
// no activate.
const CACHE = 'devgrind-v1'
const FALLBACK = '/index.html'

self.addEventListener('install', () => {
  // Assume na hora, sem esperar as abas antigas fecharem.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  )
})

// Nomes com hash (/assets/index-AbC123.js) nunca mudam de conteúdo, então
// servir do cache é sempre correto.
const imutavel = (pathname) =>
  pathname.startsWith('/assets/') ||
  /\.(png|svg|ico|woff2?|mjs)$/.test(pathname)

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok) cache.put(request, res.clone())
  return res
}

// O HTML é sempre buscado na rede: é ele que aponta para os assets novos.
// A cópia em cache só entra em jogo offline.
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(FALLBACK, res.clone())
    return res
  } catch (err) {
    const hit = await cache.match(FALLBACK)
    if (hit) return hit
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // A API nunca passa pelo cache — dado de usuário sempre vem do servidor.
  if (url.pathname.startsWith('/api/')) return

  // O próprio SW e o manifest precisam ser sempre revalidados.
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (imutavel(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

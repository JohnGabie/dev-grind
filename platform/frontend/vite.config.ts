import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8787'

// PWA sem workbox: o service worker e o manifest são estáticos, em public/.
// O workbox-build não é sequer carregável nesta máquina (SIGBUS no require) e
// traz uma árvore de dependências grande demais para o que este app precisa.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    // Qualquer host da tailnet — o nome MagicDNS muda conforme a máquina que
    // serve (fast-core, pc-win11, …) e listar um por um só gera "Blocked request".
    allowedHosts: ['.tail28966a.ts.net'],
    proxy: {
      '/api': { target: API_TARGET, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
  // Service worker exige contexto seguro. Para testar instalação no celular:
  // `vite preview` + `tailscale serve|funnel 4173`, que serve em
  // https://<host>.ts.net com certificado de verdade.
  preview: {
    allowedHosts: ['.tail28966a.ts.net'],
    proxy: {
      '/api': { target: API_TARGET, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
})

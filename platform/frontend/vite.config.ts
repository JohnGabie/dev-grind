import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    allowedHosts: ['pc-win11.tail28966a.ts.net'],
    proxy: {
      '/api': { target: API_TARGET, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
})

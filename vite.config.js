import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Los-Lomecan/', // ← cámbialo por el nombre de tu repositorio
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: false,
      timeout: 5000,
    },
    proxy: {
      '/api/openfoodfacts': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openfoodfacts/, ''),
        ws: false,
      },
    },
  },
})
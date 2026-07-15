import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // ⚠️ IMPORTANTE: Esta ruta debe coincidir EXACTAMENTE con el nombre de tu repositorio en GitHub.
  // Si en GitHub tu repositorio se llama "los-lomecan" (todo en minúsculas), cámbialo aquí abajo a: '/los-lomecan/'
  base: '/Los-Lomecan/', 

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
      // Este proxy solo funciona en tu entorno local (npm run dev)
      '/api/openfoodfacts': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openfoodfacts/, ''),
        ws: false,
      },
    },
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- IMPORTANTE: Importamos path para las rutas absolutas

export default defineConfig({
  plugins: [react()],
  // Asegúrate de que tu repositorio en GitHub se llame exactamente "Los-Lomecan" (con mayúsculas)
  base: '/Los-Lomecan/', 
  // ======= ESTO ES LO QUE FALTABA =======
  resolve: {
    alias: {
      // Le decimos a Vite que '@' equivale a la carpeta 'src'
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ======================================
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
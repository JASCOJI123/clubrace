import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin + Partner panel (spec §29-§31). Port 5174; /api proxies to the API server.
export default defineConfig({
  plugins: [react()],
  // Admin is served at /admin/ in production (via apps/api plugins/ui.ts).
  // base ensures all asset references in the built HTML are prefixed correctly.
  base: '/admin/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT ?? '4000'}`,
        changeOrigin: true,
      },
    },
  },
  build: { chunkSizeWarningLimit: 900 },
})
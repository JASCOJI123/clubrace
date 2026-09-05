import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Mini App talks to the Fastify API. In dev we proxy /api to the local
// API server (API_PORT from .env, default 4000) so the browser can log in
// via Telegram initData without CORS friction.
const API_PORT = process.env.API_PORT ?? '4000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

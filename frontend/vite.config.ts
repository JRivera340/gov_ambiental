import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    // Permite probar el flujo de handoff local con hostnames que imitan
    // subdominios reales (PLAN-MAESTRO.md HITO 0) en vez de localhost.
    allowedHosts: ['ambiental.bogotaneidapp.local'],
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  define: {
    'import.meta.env.VITE_AMBIENTAL_API_URL': JSON.stringify(process.env.VITE_AMBIENTAL_API_URL || ''),
  },
})

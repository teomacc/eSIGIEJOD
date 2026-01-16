import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * CONFIGURAÇÃO VITE - frontend
 * 
 * Responsabilidade: Configurar bundler e dev server
 * 
 * Plugins:
 * - @vitejs/plugin-react: JSX transform, HMR (Hot Module Reload)
 * 
 * Alias:
 * - @: ./src (importar como @/componentes/Button)
 * 
 * Server:
 * - Proxy para backend em localhost:3000
 * - CORS habilitado
 * - HMR ativo
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

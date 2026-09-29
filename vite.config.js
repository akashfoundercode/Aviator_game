import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://root.veronova.co.in',
        changeOrigin: true,
        secure: false,
      },
      '/Aviator': {
        target: 'https://root.veronova.co.in',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// API proxy target — defaults to :5000; override with VITE_API_PROXY if that port is taken (e.g. macOS AirPlay)
const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        ws: true,
      },
    },
  },
})

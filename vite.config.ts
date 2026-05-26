import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite already supports SPA fallback on dev. For preview/production, nginx handles it.
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // base '/' para web/Vercel; Capacitor usa 'dist/' directamente
  base: '/',
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})

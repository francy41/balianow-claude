import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // base '/' para web/Vercel; Capacitor usa 'dist/' directamente
  base: '/',
  plugins: [react(), cloudflare()],
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: true
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), cloudflare()],
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: true,
  },
  build: {
    // ── PRODUCTION HARDENING ──────────────────────────────────
    sourcemap: false,                    // No exponer mapping a TS
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',   // Quita console.log en prod
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
      format: {
        comments: false,                  // Quita comentarios
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        // Nombres aleatorios para los chunks (más difícil de mapear)
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
    target: 'es2020',
  },
  esbuild: {
    legalComments: 'none',
    // Quita console.* y debugger en producción
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
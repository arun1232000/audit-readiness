/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.PORT ?? '8787';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; set VITE_BASE=/audit-readiness/ for that build.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Lazy chunks: three.js (motion layer, loaded after first paint) and the lead form (phone input + flags).
    chunkSizeWarningLimit: 600,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'], three: ['three'], gsap: ['gsap'] } } },
  },
  test: {
    globals: true,
    css: false,
    projects: [
      { extends: true, test: { name: 'unit', environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/unit/**/*.test.{ts,tsx}'] } },
      { extends: true, test: { name: 'server', environment: 'node', include: ['tests/server/**/*.test.ts'] } },
    ],
  },
});

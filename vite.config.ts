import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the site works under any sub-path
  // (GitHub Pages serves it from /movacar/).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // The map library is one big file (about 290 kB zipped). It loads only
    // when the map is turned on, so its size doesn't slow down the table.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

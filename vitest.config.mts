import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // Mismo alias que tsconfig, para que los tests importen igual que la app.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Solo funciones puras por ahora — no hace falta jsdom.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

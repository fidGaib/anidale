import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Отдельно от vite.config.ts: для тестов не нужны плагины сборки (React SWC, postcss).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

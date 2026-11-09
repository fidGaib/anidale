import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Один раз на весь прогон: пересоздаёт схему в тестовой базе
    globalSetup: ['tests/global-setup.ts'],
    // Перед каждым файлом: подменяет базу и сокет
    setupFiles: ['tests/setup.ts'],
    // Все файлы работают с одной тестовой базой, поэтому по одному
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
})

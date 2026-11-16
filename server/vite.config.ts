import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { vitePluginGraphqlLoader } from 'vite-plugin-graphql-loader'

export default defineConfig({
  plugins: [vitePluginGraphqlLoader()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Сборка сервера в обычный ESM: в продакшене не нужен vite-node и компиляция на лету.
    ssr: 'src/index.ts',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Нативный модуль обработки картинок нельзя бандлить: это CJS с require('.node').
      // Он копируется в dist отдельным шагом (scripts/copy-native.mjs).
      external: [/src[\\/]api[\\/]post[\\/]native/],
      output: {
        // Сохраняем структуру src, чтобы относительные импорты и путь к нативному модулю совпадали
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
})

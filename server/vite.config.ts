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
})

import react from '@vitejs/plugin-react-swc'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Вендоры меняются реже кода приложения — выносим их в отдельные
        // долгоживущие чанки, чтобы после деплоя кэш браузера оставался валидным.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'apollo-vendor': ['@apollo/client', 'graphql', 'apollo-upload-client'],
          'socket-vendor': ['socket.io-client'],
          'styled-vendor': ['styled-components'],
        },
      },
    },
  },
})

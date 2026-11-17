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
  server: {
    /**
     * В разработке файлы хранилища отдаёт API. Проксируем их, чтобы картинки
     * и видео открывались с того же origin: тогда VITE_STATIC_URL можно не задавать.
     */
    proxy: {
      '/storage': 'http://localhost:5000',
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
          // Тяжёлый zxcvbn нужен только на страницах с паролем: отдельный чанк
          // подгружается вместе с ними, а не на первом экране.
          'password-vendor': ['zxcvbn'],
        },
      },
    },
  },
})

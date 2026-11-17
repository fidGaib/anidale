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
        // Vite 8 (rolldown) принимает только функцию, не объект.
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return
          if (/(^|[\\/])node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id))
            return 'react-vendor'
          if (id.includes('@apollo') || id.includes('apollo-upload-client')) return 'apollo-vendor'
          if (/node_modules[\\/]graphql[\\/]/.test(id)) return 'apollo-vendor'
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'socket-vendor'
          if (id.includes('styled-components')) return 'styled-vendor'
          // Тяжёлый zxcvbn нужен только на страницах с паролем: отдельный чанк
          // подгружается вместе с ними, а не на первом экране.
          if (id.includes('zxcvbn')) return 'password-vendor'
        },
      },
    },
  },
})

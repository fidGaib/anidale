import { ApolloClient, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'

import { GRAPHQL_URL } from '@/shared/config'
import { progressFetch } from '@/shared/lib/progress-fetch'

/**
 * Единый Apollo-клиент приложения. Вынесен из with-router.tsx в отдельный модуль без компонентов:
 * with-router импортирует фичи (плеер, мессенджер), а их хранилища берут клиент отсюда.
 * Пока клиент жил в with-router, получался цикл импортов, и горячая замена Vite зацикливалась.
 */
export const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: createUploadLink({
    uri: GRAPHQL_URL,
    credentials: 'include',
    // Запросы с context.fetchOptions.onProgress идут через XHR и сообщают прогресс загрузки
    fetch: progressFetch as typeof fetch,
  }),
})

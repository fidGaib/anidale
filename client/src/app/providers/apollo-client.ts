import { ApolloClient, FieldMergeFunction, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'

import { GRAPHQL_URL } from '@/shared/config'
import { progressFetch } from '@/shared/lib/progress-fetch'

// Постраничные списки дописываются по offset: fetchMore подставляет новую страницу в конец
const mergeByOffset: FieldMergeFunction = (existing = [], incoming, { args }) => {
  const offset = args?.offset ?? 0
  // Первая страница заменяет список целиком (важно после удаления/фильтра), остальные дописываются
  if (offset === 0) return incoming.slice(0)
  const merged = existing.slice(0)
  for (let i = 0; i < incoming.length; i++) merged[offset + i] = incoming[i]
  return merged
}

/**
 * Единый Apollo-клиент приложения. Вынесен из with-router.tsx в отдельный модуль без компонентов:
 * with-router импортирует фичи (плеер, мессенджер), а их хранилища берут клиент отсюда.
 * Пока клиент жил в with-router, получался цикл импортов, и горячая замена Vite зацикливалась.
 */
export const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Постраничный список: страницы склеиваются по offset, кеш раздельный для разных search
          getUsers: {
            keyArgs: ['search'],
            merge: mergeByOffset,
          },
          getFriends: {
            keyArgs: ['id'],
            merge: mergeByOffset,
          },
          getSubscribers: {
            keyArgs: ['id'],
            merge: mergeByOffset,
          },
          getPhotos: {
            keyArgs: ['id'],
            merge: mergeByOffset,
          },
        },
      },
    },
  }),
  link: createUploadLink({
    uri: GRAPHQL_URL,
    credentials: 'include',
    // Запросы с context.fetchOptions.onProgress идут через XHR и сообщают прогресс загрузки
    fetch: progressFetch as typeof fetch,
  }),
})

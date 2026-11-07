const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

/**
 * Базовый адрес API (GraphQL и сокет).
 * Переопределяется через VITE_API_URL, по умолчанию — локальная разработка.
 */
export const API_URL = trimTrailingSlashes(import.meta.env.VITE_API_URL ?? 'http://localhost:5000')

/**
 * Базовый адрес статики: иконки, картинки, /storage.
 * Переопределяется через VITE_STATIC_URL. Пустое значение = тот же origin, что и фронтенд.
 */
export const STATIC_URL = trimTrailingSlashes(import.meta.env.VITE_STATIC_URL ?? 'http://localhost')

/** Сокет можно вынести на отдельный хост, по умолчанию совпадает с API. */
export const SOCKET_URL = trimTrailingSlashes(import.meta.env.VITE_SOCKET_URL ?? API_URL)

export const GRAPHQL_URL = `${API_URL}/graphql`

/** Ссылка на файл статики: assetUrl('icons/like.svg') → http://host/icons/like.svg */
export const assetUrl = (path: string) => `${STATIC_URL}/${path.replace(/^\/+/, '')}`

/** Ссылка на файл из хранилища бэкенда: storageUrl('ab/cd.webp') → http://host/storage/ab/cd.webp */
export const storageUrl = (path: string) => `${STATIC_URL}/storage/${path.replace(/^\/+/, '')}`

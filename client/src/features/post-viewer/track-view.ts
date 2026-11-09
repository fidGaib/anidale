import { client } from '@/app/providers/apollo-client'
import { VIEW_POSTS } from '@/shared/graphql/schema'

import { usePostSync } from './sync'

/** Через сколько после первого просмотра отправляется пачка: так на ленту уходит один запрос, а не по запросу на пост. */
export const FLUSH_DELAY_MS = 2000

/** Посты, о которых сервер уже спрошен в этой вкладке: повторно за один сеанс не отправляются. */
const seen = new Set<number>()
const queue = new Set<number>()
let timer: ReturnType<typeof setTimeout> | undefined

const flush = async () => {
  timer = undefined
  const ids = [...queue]
  queue.clear()
  if (!ids.length) return
  try {
    const { data } = await client.mutate({ mutation: VIEW_POSTS, variables: { ids } })
    // Счётчик на экране — ровно то, что решил сервер: он считает один просмотр на человека и не считает автора
    for (const { id, views } of data?.viewPosts ?? []) usePostSync.getState().publish({ id, views })
  } catch {
    // Счётчик просмотров не критичен: потеряем пачку, но не сломаем страницу
  }
}

/** Сообщает серверу, что пост показан пользователю (с задержкой и пачками). Сколько просмотров засчитано, решает сервер. */
export const trackView = (postId: number) => {
  if (!postId || seen.has(postId)) return
  seen.add(postId)
  queue.add(postId)
  if (!timer) timer = setTimeout(() => void flush(), FLUSH_DELAY_MS)
}

/** Только для тестов: сбрасывает накопленное состояние. */
export const resetTrackViewForTests = () => {
  seen.clear()
  queue.clear()
  if (timer) clearTimeout(timer)
  timer = undefined
}

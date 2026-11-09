import { client } from '@/app/providers/apollo-client'
import { VIEW_POSTS } from '@/shared/graphql/schema'

import { usePostSync } from './sync'

/** Посты, просмотр которых уже засчитан в этой вкладке: один пост — один просмотр за сеанс. */
const seen = new Set<number>()
const queue = new Set<number>()
let timer: ReturnType<typeof setTimeout> | undefined

const flush = async () => {
  timer = undefined
  const ids = [...queue]
  queue.clear()
  if (!ids.length) return
  try {
    await client.mutate({ mutation: VIEW_POSTS, variables: { ids } })
  } catch {
    // Счётчик просмотров не критичен: потеряем пачку, но не сломаем страницу
  }
}

/** Засчитывает просмотр поста (с задержкой и пачками, чтобы не слать запрос на каждый пост). */
export const trackView = (postId: number, currentViews: number) => {
  if (!postId || seen.has(postId)) return
  seen.add(postId)
  queue.add(postId)
  // Счётчик на экране растёт сразу
  usePostSync.getState().publish({ id: postId, views: currentViews + 1 })
  if (!timer) timer = setTimeout(() => void flush(), 2000)
}

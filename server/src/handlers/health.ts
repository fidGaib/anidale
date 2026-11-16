import http from 'http'

import prisma from '@/db/db'
import { pingRedis, redisEnabled } from '@/redis'

/**
 * Проверка живости для мониторинга и nginx.
 * Отвечает без секретов и без кэша: только состояние базы, Redis и время работы.
 *
 * 200 — сервер может обслуживать запросы (Redis может быть недоступен: это
 * деградация, а не отказ, сервер умеет работать без кэша).
 * 503 — база недоступна, без неё приложение не работает.
 */
export const healthCheck = async (res: http.ServerResponse) => {
  let database: 'ok' | 'down' = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    database = 'down'
    console.error('Проверка здоровья: база недоступна', error)
  }

  // off — Redis не настроен, это штатный режим; down — настроен, но не отвечает
  const redis = redisEnabled ? ((await pingRedis()) ? 'ok' : 'down') : 'off'

  const healthy = database === 'ok'
  const status = !healthy ? 'down' : redis === 'down' ? 'degraded' : 'ok'

  res.writeHead(healthy ? 200 : 503, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(
    JSON.stringify({
      status,
      database,
      redis,
      uptime: Math.round(process.uptime()),
    }),
  )
}

import http from 'http'
import { statfsSync } from 'node:fs'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import { pingRedis, redisEnabled } from '@/redis'
import { logger } from '@/utils/logger'

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
    logger.error('Проверка здоровья: база недоступна', error)
  }

  // Свободное место там, где лежат загрузки: заканчивается диск — загрузки и БД встанут
  let diskFreeMb: number | null = null
  try {
    const stats = statfsSync(storagePath)
    diskFreeMb = Math.round((stats.bavail * stats.bsize) / 1024 / 1024)
  } catch {
    // Нет каталога или платформа не поддерживает statfs — просто не показываем
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
      diskFreeMb,
    }),
  )
}

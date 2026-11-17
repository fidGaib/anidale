import Redis from 'ioredis'

import { logger } from '@/utils/logger'

/**
 * Общий Redis: кэш, счётчики ограничителей и присутствие пользователей.
 * Данные должны быть одинаковыми у нескольких процессов сервера.
 *
 * Адрес задаётся в REDIS_URL. Если переменная пустая, сервер работает как
 * раньше: кэш отключён, ограничители считаются в PostgreSQL, присутствие —
 * в памяти процесса.
 */
const url = process.env.REDIS_URL?.trim()

export const redisEnabled = Boolean(url)

export const redis = url
  ? new Redis(url, {
      // Подключаемся при первом обращении, а не при импорте модуля: сервер
      // должен запускаться даже при лежащем Redis.
      lazyConnect: true,
      // Не копим команды в очереди: если Redis недоступен, кэш должен быстро
      // уступать дорогу обычной загрузке данных, а не тормозить запросы.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      // Локальный Redis поднимается мгновенно; долгое ожидание только задержит запрос
      connectTimeout: 2000,
      retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
    })
  : null

if (redis) {
  redis.on('ready', () => logger.info('Redis подключён'))
  redis.on('error', (error) => logger.error('Redis:', error.message))
}

let connecting: Promise<void> | null = null

/** Дополнительные соединения (Socket.IO): их тоже закрываем при остановке. */
const extraConnections: Redis[] = []

/**
 * Отдельное соединение для Socket.IO. Адаптеру нужны два независимых клиента:
 * один публикует события, второй подписывается.
 */
export const createRedisConnection = () => {
  if (!url) return null
  const client = new Redis(url, {
    lazyConnect: true,
    // Публикация событий не должна теряться при коротком разрыве связи.
    enableOfflineQueue: true,
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
  })
  client.on('error', (error) => logger.error('Redis (сокеты):', error.message))
  extraConnections.push(client)
  return client
}

const isReady = () => redis?.status === 'ready'

/** Подключается при первом обращении. false — Redis недоступен. */
const ensureConnected = async () => {
  if (!redis) return false
  if (isReady()) return true
  if (redis.status === 'wait' || redis.status === 'end') connecting ??= redis.connect()
  // Пока идёт первое подключение, остальные обращения ждут его, а не идут мимо кэша
  if (connecting) {
    try {
      await connecting
    } catch {
      connecting = null
      return false
    }
  }
  return isReady()
}

/**
 * Клиент для общих данных или null, если Redis не настроен или лежит.
 * Все, кто работает с Redis напрямую, должны брать клиент отсюда: так
 * ленивое подключение включается в любом месте, а не только в старте сервера.
 */
export const getRedis = async () => ((await ensureConnected()) && redis ? redis : null)

/** Проверка связи при старте. Не мешает работе, если Redis не поднялся. */
export const pingRedis = async () => {
  if (!(await ensureConnected()) || !redis) return false
  try {
    return (await redis.ping()) === 'PONG'
  } catch {
    return false
  }
}

/**
 * Дата в JSON превращается в строку и ломает GraphQL-скаляр Date (а также
 * сравнения дат на клиенте), поэтому перед записью заменяем её меткой с числом.
 * JSON.stringify вызывает toJSON у Date раньше replacer, поэтому обходим значение сами.
 */
const DATE_KEY = '__anidale_date'

const markDates = (value: unknown): unknown => {
  if (value instanceof Date) return { [DATE_KEY]: value.getTime() }
  if (Array.isArray(value)) return value.map(markDates)
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) result[key] = markDates(item)
    return result
  }
  return value
}

const reviveDates = (_key: string, value: unknown) => {
  if (value && typeof value === 'object') {
    const timestamp = (value as Record<string, unknown>)[DATE_KEY]
    if (typeof timestamp === 'number') return new Date(timestamp)
  }
  return value
}

/** Читает значение из кэша. null — промах или недоступный Redis. */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const client = await getRedis()
  if (!client) return null
  try {
    const raw = await client.get(key)
    return raw === null ? null : (JSON.parse(raw, reviveDates) as T)
  } catch (error) {
    logger.error('Redis: не удалось прочитать кэш', key, error)
    return null
  }
}

/** Кладёт значение в кэш на ttlSeconds секунд. Ошибки не пробрасываются. */
export const cacheSet = async (key: string, value: unknown, ttlSeconds: number) => {
  const client = await getRedis()
  if (!client) return
  try {
    await client.set(key, JSON.stringify(markDates(value)), 'EX', Math.max(1, Math.round(ttlSeconds)))
  } catch (error) {
    logger.error('Redis: не удалось записать кэш', key, error)
  }
}

/** Удаляет ключи кэша (например, после изменения данных в админке). */
export const cacheDel = async (...keys: string[]) => {
  if (!keys.length) return
  const client = await getRedis()
  if (!client) return
  try {
    await client.del(...keys)
  } catch (error) {
    logger.error('Redis: не удалось удалить кэш', keys, error)
  }
}

/**
 * Отдаёт значение из кэша, а при промахе вызывает load и запоминает результат.
 * Если Redis недоступен, каждый раз вызывает load.
 */
export const withCache = async <T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> => {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached
  const value = await load()
  if (value !== null && value !== undefined) await cacheSet(key, value, ttlSeconds)
  return value
}

export interface VersionedCache {
  /** Значение из кэша; при промахе вызывает load и запоминает результат. */
  load: <T>(name: string, load: () => Promise<T>) => Promise<T>
  /** Помечает весь кэш устаревшим: новые ключи получают новую версию, старые добирает TTL. */
  invalidate: () => Promise<void>
}

/**
 * Кэш с общей версией. После любой правки версия увеличивается, и старые ключи
 * перестают читаться — не нужно перечислять и удалять их вручную.
 */
export const createVersionedCache = (prefix: string, ttlSeconds: number): VersionedCache => {
  const versionKey = `${prefix}:version`

  const version = async () => {
    const client = await getRedis()
    if (!client) return null
    try {
      return (await client.get(versionKey)) ?? '0'
    } catch (error) {
      logger.error('Redis: не удалось прочитать версию кэша', prefix, error)
      return null
    }
  }

  return {
    async load<T>(name: string, load: () => Promise<T>) {
      const current = await version()
      // null — кэш недоступен, работаем напрямую с базой
      if (current === null) return await load()
      return await withCache(`${prefix}:${current}:${name}`, ttlSeconds, load)
    },
    async invalidate() {
      const client = await getRedis()
      if (!client) return
      try {
        await client.incr(versionKey)
      } catch (error) {
        logger.error('Redis: не удалось сбросить кэш', prefix, error)
      }
    },
  }
}

/** Аккуратно закрывает соединения при остановке сервера. */
export const closeRedis = async () => {
  connecting = null
  for (const client of extraConnections.splice(0)) {
    try {
      await client.quit()
    } catch {
      client.disconnect()
    }
  }
  if (!redis) return
  try {
    await redis.quit()
  } catch {
    redis.disconnect()
  }
}

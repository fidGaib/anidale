import { getRedis } from '@/redis'

/**
 * Присутствие: у каждого открытого сокета есть запись в Redis, поэтому статус
 * «в сети» общий для всех процессов сервера. Без Redis счётчики живут в памяти
 * процесса — как раньше.
 *
 * Записи в Redis — ZSET пользователя: socket id → время, до которого сокет
 * считается живым. Пока клиент присылает heartbeat, время продлевается; если
 * процесс упал, просроченные сокеты перестают учитываться сами.
 */
const TTL_MS = 90_000
const DEFAULT_SOCKET = 'local'

const redisKey = (userId: number) => `anidale:presence:${userId}`

/** Запасной вариант без Redis: сколько сокетов открыто у каждого пользователя. */
const connections = new Map<number, Set<string>>()

const memoryConnect = (userId: number, socketId: string) => {
  const sockets = connections.get(userId)
  if (sockets) {
    sockets.add(socketId)
    return false
  }
  connections.set(userId, new Set([socketId]))
  return true
}

const memoryDisconnect = (userId: number, socketId: string) => {
  const sockets = connections.get(userId)
  if (!sockets) return true
  sockets.delete(socketId)
  if (sockets.size > 0) return false
  connections.delete(userId)
  return true
}

/** Возвращает true, если это первое подключение пользователя (он только что стал «в сети»). */
export const markConnected = async (userId: number, socketId = DEFAULT_SOCKET) => {
  const client = await getRedis()
  if (!client) return memoryConnect(userId, socketId)
  try {
    const key = redisKey(userId)
    const now = Date.now()
    const result = await client
      .multi()
      .zadd(key, now + TTL_MS, socketId)
      .zremrangebyscore(key, '-inf', now)
      .zcard(key)
      .pexpire(key, TTL_MS)
      .exec()
    const count = Number(result?.[2]?.[1] ?? 0)
    return count === 1
  } catch (error) {
    console.error('Redis: не удалось отметить подключение', error)
    return memoryConnect(userId, socketId)
  }
}

/** Возвращает true, если закрылось последнее подключение (пользователь ушёл «из сети»). */
export const markDisconnected = async (userId: number, socketId = DEFAULT_SOCKET) => {
  const client = await getRedis()
  if (!client) return memoryDisconnect(userId, socketId)
  try {
    const key = redisKey(userId)
    await client.zrem(key, socketId)
    const count = await client.zcard(key)
    if (count > 0) return false
    await client.del(key)
    return true
  } catch (error) {
    console.error('Redis: не удалось отметить отключение', error)
    return memoryDisconnect(userId, socketId)
  }
}

/** Продлевает жизнь сокета по heartbeat. Без Redis ничего делать не нужно. */
export const touchPresence = async (userId: number, socketId = DEFAULT_SOCKET) => {
  const client = await getRedis()
  if (!client) return
  try {
    const key = redisKey(userId)
    await client.multi().zadd(key, 'XX', Date.now() + TTL_MS, socketId).pexpire(key, TTL_MS).exec()
  } catch (error) {
    console.error('Redis: не удалось продлить присутствие', error)
  }
}

/** В сети ли пользователь: есть хотя бы один живой сокет. */
export const isOnline = async (userId: number) => {
  const client = await getRedis()
  if (!client) return connections.has(userId)
  try {
    const key = redisKey(userId)
    await client.zremrangebyscore(key, '-inf', Date.now())
    const count = await client.zcard(key)
    if (count === 0) {
      await client.del(key)
      return false
    }
    return true
  } catch (error) {
    console.error('Redis: не удалось проверить присутствие', error)
    return connections.has(userId)
  }
}

/** Какие из пользователей сейчас в сети. Один pipeline вместо запроса на каждого. */
export const onlineUsers = async (userIds: number[]) => {
  if (!userIds.length) return new Set<number>()
  const client = await getRedis()
  if (!client) return new Set(userIds.filter((id) => connections.has(id)))
  try {
    const now = Date.now()
    const pipeline = client.pipeline()
    for (const userId of userIds) {
      const key = redisKey(userId)
      pipeline.zremrangebyscore(key, '-inf', now)
      pipeline.zcard(key)
    }
    const results = await pipeline.exec()
    const online = new Set<number>()
    if (!results) return online
    userIds.forEach((userId, index) => {
      const count = Number(results[index * 2 + 1]?.[1] ?? 0)
      if (count > 0) online.add(userId)
    })
    return online
  } catch (error) {
    console.error('Redis: не удалось проверить присутствие', error)
    return new Set(userIds.filter((id) => connections.has(id)))
  }
}

/** Комната подписчиков на статус пользователя. */
export const presenceRoom = (userId: number) => `presence:${userId}`

import 'dotenv/config'
import { createAdapter } from '@socket.io/redis-adapter'
import http from 'http'
import { Server as IoServer } from 'socket.io'

import { getOptionalUserId } from './api/user/optional-user'
import prisma from './db/db'
import { parseCookies } from './handlers/cookie-parser'
import { applyCors, getAllowedOrigins } from './handlers/cors'
import { serveStatic } from './handlers/file-upload'
import { healthCheck } from './handlers/health'
import { markConnected, markDisconnected, presenceRoom, touchPresence } from './handlers/presence'
import { storageAuth } from './handlers/storage-auth'
import { closeRedis, createRedisConnection, pingRedis, redis, redisEnabled } from './redis'
import { yoga } from './schema'
import { logger } from './utils/logger'

const server = http.createServer()
const io = new IoServer(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  },
})

// Единый обработчик запросов
server.on('request', async (req, res) => {
  try {
    // Обработка preflight-запросов
    if (req.method === 'OPTIONS') {
      applyCors(req, res)
      res.writeHead(204)
      res.end()
      return
    }
    applyCors(req, res)
    // Заголовки безопасности для всех ответов: браузер не должен угадывать тип файла и вставлять сайт во фреймы
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    // Проверка живости для мониторинга: база и Redis, без секретов
    if (req.url === '/healthz' || req.url?.startsWith('/healthz?')) {
      await healthCheck(res)
      return
    }
    // Проверка доступа к файлам для nginx
    if (req.url?.startsWith('/_storage-auth')) {
      await storageAuth(req, res)
      return
    }
    if (serveStatic(req, res)) {
      return
    }
    // Парсим куки и добавляем в req
    const cookies = parseCookies(req)
    ;(req as http.IncomingMessage & { cookies: Record<string, string> }).cookies = cookies // Расширяем тип req
    // GraphQL через Yoga
    if (req.url?.startsWith('/graphql')) {
      await yoga(req, res)
      return
    }
    // Socket.IO отвечает на /socket.io сам, его запросы не трогаем
    if (req.url?.startsWith('/socket.io')) return
    // Всё остальное: явный 404, иначе запрос висит без ответа
    if (!res.headersSent && !res.writableEnded) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
    }
  } catch (error) {
    logger.error('Ошибка обработки запроса', error)
  }
})

// Обработчик Socket.IO
io.on('connection', async (socket) => {
  logger.debug('Клиент подключился:', socket.id)
  // Вошедший пользователь получает личные события (сообщения) через свою комнату.
  // Куки читаем из рукопожатия, поэтому после входа клиент переподключает сокет.
  const userId = await getOptionalUserId({ cookies: parseCookies(socket.request) })
  if (userId) {
    socket.join(`user:${userId}`)
    if (await markConnected(userId, socket.id)) {
      io.to(presenceRoom(userId)).emit('presence', { userId, online: true, lastSeenAt: null })
    }
    // Heartbeat продлевает запись в Redis: упавший процесс не оставит человека «в сети» навсегда
    socket.conn.on('heartbeat', () => void touchPresence(userId, socket.id))
  }
  // Подписка на статус собеседника открытого чата: одна за раз
  let watched: number | null = null
  socket.on('watch', (payload: unknown) => {
    const target = (payload as { userId?: unknown } | null)?.userId
    if (watched !== null) socket.leave(presenceRoom(watched))
    watched = typeof target === 'number' && Number.isInteger(target) ? target : null
    if (watched !== null) socket.join(presenceRoom(watched))
  })
  // «Печатает…»: пересылаем собеседнику только от авторизованного отправителя
  socket.on('typing', (payload: unknown) => {
    const to = (payload as { to?: unknown } | null)?.to
    if (!userId || typeof to !== 'number' || !Number.isInteger(to) || to === userId) return
    io.to(`user:${to}`).emit('typing', { from: userId })
  })
  socket.on('disconnect', async () => {
    logger.debug('Клиент отключился:', socket.id)
    if (userId && (await markDisconnected(userId, socket.id))) {
      const lastSeenAt = new Date()
      io.to(presenceRoom(userId)).emit('presence', { userId, online: false, lastSeenAt })
      try {
        await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } })
      } catch (error) {
        logger.error('Не удалось записать время последнего визита', error)
      }
    }
  })
})

const stopApplication = (server: http.Server) => {
  server.close()
  void closeRedis()
  return new Promise((resolve) => {
    server.on('close', () => resolve(0))
  })
}

const onHotReload = async (server: http.Server) => {
  const hotContext = import.meta.hot
  if (hotContext) {
    await hotContext.data.stopping
    hotContext.on('vite:beforeFullReload', async () => {
      logger.debug('Performing an HMR reload...')
      hotContext.data.stopping = stopApplication(server)
    })
  }
}

/** Включает обмен событиями между процессами через Redis. Без Redis сервер работает как обычно. */
let adapterEnabled = false
let adapterSetup: Promise<void> | null = null

const setupRedisAdapter = async () => {
  const pubClient = createRedisConnection()
  const subClient = createRedisConnection()
  if (!pubClient || !subClient) return
  try {
    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(createAdapter(pubClient, subClient))
    logger.info('Socket.IO: Redis-адаптер включён')
  } catch (error) {
    pubClient.disconnect()
    subClient.disconnect()
    throw error
  }
}

/** Одновременные вызовы (старт и восстановление связи) делят одну попытку; после ошибки можно повторить. */
const enableRedisAdapter = () => {
  if (adapterEnabled) return Promise.resolve()
  adapterSetup ??= setupRedisAdapter()
    .then(() => {
      adapterEnabled = true
    })
    .catch((error) => {
      logger.error('Socket.IO: не удалось включить Redis-адаптер, работаем без него', error)
      adapterSetup = null
    })
  return adapterSetup
}

const start = async () => {
  try {
    if (import.meta.hot) await import.meta.hot.data.stopping
    if (redisEnabled) {
      // Если Redis поднимется позже, адаптер включится при первом успешном подключении
      redis?.on('ready', () => void enableRedisAdapter())
      const redisReady = await pingRedis()
      logger.info(
        redisReady
          ? 'Redis готов — кэш, онлайн-статусы и лимиты общие'
          : 'Redis недоступен — без кэша: лимиты в PostgreSQL, статусы в памяти процесса',
      )
      // Адаптер позволяет нескольким процессам сервера обмениваться событиями сокетов
      // (сообщения, «печатает…», статусы онлайна) через общий Redis.
      if (redisReady) await enableRedisAdapter()
    }
    server.listen(process.env.PORT, () => logger.info(`Server started on port ${process.env.PORT}`))
    onHotReload(server)
  } catch (e) {
    logger.error('Не удалось запустить сервер', e)
  }
}

start()

export { io }

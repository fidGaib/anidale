import { createGraphQLError } from 'graphql-yoga'

import prisma from '@/db/db'
import { getRedis } from '@/redis'
import { logger } from '@/utils/logger'

const SECOND = 1000
const MINUTE = 60 * SECOND

const REDIS_PREFIX = 'anidale:limit:'

/**
 * Лимиты по действиям: не больше `max` обращений за окно `windowMs` на одного субъекта (человека или адрес).
 * Против подбора паролей, массовой регистрации, спама комментариями и записями, заливки файлов в цикле.
 */
export const POLICIES = {
  login: { max: 8, windowMs: 15 * MINUTE, message: 'Слишком много неудачных попыток входа' },
  loginIp: { max: 40, windowMs: 15 * MINUTE, message: 'Слишком много попыток входа с вашего адреса' },
  registration: { max: 10, windowMs: 60 * MINUTE, message: 'Слишком много регистраций с вашего адреса' },
  createCommunity: { max: 5, windowMs: 60 * MINUTE, message: 'Слишком много новых сообществ' },
  post: { max: 20, windowMs: 10 * MINUTE, message: 'Вы публикуете слишком часто' },
  comment: { max: 30, windowMs: MINUTE, message: 'Вы комментируете слишком часто' },
  message: { max: 60, windowMs: MINUTE, message: 'Вы отправляете сообщения слишком часто' },
  upload: { max: 40, windowMs: 10 * MINUTE, message: 'Вы загружаете файлы слишком часто' },
  reaction: { max: 120, windowMs: MINUTE, message: 'Слишком много оценок подряд' },
  discussion: { max: 30, windowMs: 5 * MINUTE, message: 'Вы пишете в обсуждениях слишком часто' },
  join: { max: 30, windowMs: 10 * MINUTE, message: 'Слишком много подписок подряд' },
  emailSend: { max: 5, windowMs: 60 * MINUTE, message: 'Слишком много писем с вашего адреса' },
  emailResend: { max: 3, windowMs: 60 * MINUTE, message: 'Письмо можно запросить не больше трёх раз в час' },
  passwordReset: { max: 3, windowMs: 60 * MINUTE, message: 'Слишком много запросов на восстановление пароля' },
  passwordChange: { max: 5, windowMs: 15 * MINUTE, message: 'Слишком много попыток смены пароля' },
} as const

export type Policy = keyof typeof POLICIES

export interface LimitResult {
  allowed: boolean
  /** Через сколько секунд окно закончится и можно будет повторить. */
  retryAfter: number
}

/**
 * Счётчик в Redis: INCR и установка окна одним скриптом, поэтому одновременные
 * обращения не обгоняют друг друга, а счётчик общий для всех процессов.
 */
const redisHit = async (key: string, max: number, windowMs: number): Promise<LimitResult | null> => {
  const client = await getRedis()
  if (!client) return null
  try {
    const [count, ttl] = (await client.eval(
      `local count = redis.call('INCR', KEYS[1])
       local ttl = redis.call('PTTL', KEYS[1])
       if ttl < 0 then
         redis.call('PEXPIRE', KEYS[1], ARGV[1])
         ttl = tonumber(ARGV[1])
       end
       return {count, ttl}`,
      1,
      `${REDIS_PREFIX}${key}`,
      String(Math.max(1, Math.round(windowMs))),
    )) as [number, number]
    return {
      allowed: count <= max,
      retryAfter: Math.max(Math.ceil(ttl / SECOND), 1),
    }
  } catch (error) {
    logger.error('Redis: не удалось проверить лимит, считаем в базе', key, error)
    return null
  }
}

/**
 * Считает обращение в базе: общий счётчик у всех процессов сервера и переживает перезапуск.
 * Окно фиксированное: первое обращение открывает его, по истечении счётчик начинается заново.
 * Одним запросом (INSERT … ON CONFLICT), поэтому одновременные обращения не обгоняют друг друга.
 * Запасной путь на случай, когда Redis не настроен или лежит.
 */
const databaseHit = async (key: string, max: number, windowMs: number, now: Date): Promise<LimitResult> => {
  const resetAt = new Date(now.getTime() + windowMs)
  // Время передаём ISO-строкой и приводим к «наивному» UTC, как его хранит Prisma: часовой пояс сервера не влияет
  const nowUtc = now.toISOString()
  const resetUtc = resetAt.toISOString()
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, (${resetUtc}::timestamptz AT TIME ZONE 'UTC'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= (${nowUtc}::timestamptz AT TIME ZONE 'UTC') THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= (${nowUtc}::timestamptz AT TIME ZONE 'UTC') THEN (${resetUtc}::timestamptz AT TIME ZONE 'UTC') ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`
  const row = rows[0]
  // Изредка убираем давно закончившиеся окна, чтобы таблица не росла
  if (Math.random() < 0.01) {
    void prisma.rateLimit
      .deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * MINUTE) } } })
      .catch(() => undefined)
  }
  return {
    allowed: row.count <= max,
    retryAfter: Math.max(Math.ceil((row.resetAt.getTime() - now.getTime()) / SECOND), 1),
  }
}

/**
 * Считает обращение: сначала в Redis (общий счётчик процессов, окно истекает само),
 * при недоступном Redis — в базе. `now` нужен только запасному пути: в Redis окно
 * отсчитывается от реального времени.
 */
export const hit = async (key: string, max: number, windowMs: number, now = new Date()): Promise<LimitResult> => {
  const cached = await redisHit(key, max, windowMs)
  if (cached) return cached
  return await databaseHit(key, max, windowMs, now)
}

/** Сбрасывает счётчик (например, после успешного входа). */
export const resetLimit = async (policy: Policy, subject: string | number) => {
  const key = `${policy}:${subject}`
  const client = await getRedis()
  if (client) await client.del(`${REDIS_PREFIX}${key}`).catch(() => undefined)
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => undefined)
}

/**
 * Проверяет лимит действия для человека или адреса и бросает понятную ошибку, если он исчерпан.
 * Если база недоступна, действие пропускается: сбой счётчиков не должен ронять сайт.
 */
export const throttle = async (policy: Policy, subject: string | number) => {
  const { max, windowMs, message } = POLICIES[policy]
  let result: LimitResult
  try {
    result = await hit(`${policy}:${subject}`, max, windowMs)
  } catch (error) {
    logger.error('Не удалось проверить лимит', policy, error)
    return
  }
  if (!result.allowed) {
    const wait = result.retryAfter >= 60 ? `${Math.ceil(result.retryAfter / 60)} мин.` : `${result.retryAfter} с.`
    throw createGraphQLError(`${message}. Попробуйте через ${wait}`)
  }
}

/** Адрес клиента. За обратным прокси (nginx) заголовку X-Forwarded-For верим, только если включён TRUST_PROXY=1. */
export const clientIp = (req: {
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}) => {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for']
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
    if (first) return first
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

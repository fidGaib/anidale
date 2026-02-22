import dns from 'dns'
import { promisify } from 'util'
import validator from 'validator'

/**
 * Проверяет email по нескольким критериям
 * @param email - строка для проверки
 * @returns { valid: boolean; reason: string | null } — результат валидации и причина ошибки (если есть)
 */
export const validateEmail = async (email: string): Promise<{ valid: boolean; reason: string | null }> => {
  // 1. Обязательные проверки
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email не является строкой или пуст' }
  }

  // 2. Длина (RFC: макс. 254 символа)
  if (email.length > 254) {
    return { valid: false, reason: 'Email превышает 254 символа' }
  }

  // 3. Синтаксис (через validator)
  if (!validator.isEmail(email, { require_tld: true })) {
    return { valid: false, reason: 'Некорректный формат email' }
  }

  // 4. Разбор домена
  const domainParts = email.split('@')
  if (domainParts.length !== 2) {
    return { valid: false, reason: 'Должно быть ровно одно @' }
  }

  const domain = domainParts[1].toLowerCase()
  const tld = domain.split('.').pop()

  if (!domain || !tld || tld.length < 2) {
    return { valid: false, reason: 'Домен или TLD некорректны' }
  }

  // 5. Запрещённые домены (временные почты)
  const blockedDomains = new Set([
    'mailinator.com',
    '10minutemail.com',
    'guerrillamail.com',
    'tempmail.com',
    'yopmail.com',
  ])

  if (blockedDomains.has(domain)) {
    return { valid: false, reason: 'Запрещённый домен (временная почта)' }
  }

  // 6. Проверка MX‑записей с кешированием и таймаутом
  try {
    const hasMx = await checkMxWithCache(domain)
    if (!hasMx) {
      return { valid: false, reason: 'Домен не поддерживает почту (нет MX-записей)' }
    }
  } catch (err) {
    return {
      valid: false,
      reason: `Ошибка проверки MX-записей: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }

  return { valid: true, reason: null }
}

// Кеш: домен → результат (с TTL)
const mxCache = new Map<string, { value: boolean; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут
const MAX_CACHE_SIZE = 10000
const RESOLVE_MX = promisify(dns.resolveMx)

/**
 * Проверяет MX‑записи домена с кешированием и оптимизированным таймаутом
 * @param domain - домен для проверки
 * @returns true, если MX‑записи найдены
 */
async function checkMxWithCache(domain: string): Promise<boolean> {
  const now = Date.now()

  // 1. Проверка кеша (с учётом TTL)
  const cached = mxCache.get(domain)
  if (cached && cached.expires > now) {
    return cached.value
  }

  // 2. Ограничение размера кеша
  if (mxCache.size >= MAX_CACHE_SIZE) {
    // Удаляем самые старые записи
    const oldestKey = [...mxCache.entries()].sort(([, a], [, b]) => a.expires - b.expires).map(([k]) => k)[0]
    mxCache.delete(oldestKey)
  }

  // 3. Быстрый отказ для заведомо плохих доменов
  if (domain.length > 253 || !/^[a-z0-9.-]+$/i.test(domain)) {
    mxCache.set(domain, { value: false, expires: now + CACHE_TTL })
    return false
  }

  // 4. DNS‑запрос с сокращённым таймаутом (2 сек вместо 5)
  try {
    const records = await Promise.race([
      RESOLVE_MX(domain),
      new Promise<never>((_, reject) => setTimeout(reject, 2000)),
    ])

    const hasMx = Array.isArray(records) && records.length > 0
    mxCache.set(domain, { value: hasMx, expires: now + CACHE_TTL })
    return hasMx
  } catch (err) {
    // Кешируем отрицательный результат на 1 минуту (чтобы не перегружать DNS)
    mxCache.set(domain, { value: false, expires: now + 60000 })
    return false
  }
}

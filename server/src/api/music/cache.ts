import { createVersionedCache } from '@/redis'

/**
 * Кэш публичных списков музыки. Версия общая: загрузка, добавление и удаление
 * трека сбрасывают весь кэш, поэтому страницы не показывают устаревшие данные.
 *
 * Если Redis недоступен, функции прозрачно работают без кэша.
 */
const TTL_SECONDS = 60
const cache = createVersionedCache('anidale:music', TTL_SECONDS)

export const musicCached = cache.load
export const invalidateMusicCache = cache.invalidate

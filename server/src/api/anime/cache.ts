import { createVersionedCache } from '@/redis'

/**
 * Кэш публичного каталога аниме. Ключи версионируются: любая правка в админке
 * увеличивает версию, и старые ключи просто перестают читаться (их добирает TTL).
 *
 * Если Redis недоступен, функции прозрачно работают без кэша.
 */
const TTL_SECONDS = 30
const cache = createVersionedCache('anidale:anime', TTL_SECONDS)

/** Отдаёт значение из кэша каталога, а при промахе загружает его и запоминает. */
export const animeCached = cache.load

/** Сбрасывает кэш каталога после создания, изменения или удаления данных. */
export const invalidateAnimeCache = cache.invalidate

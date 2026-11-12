import { Prisma } from '@prisma/client'
import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'

import AnimeStorageService from './anime-storage'

export const SEASONS = ['Зима', 'Весна', 'Лето', 'Осень'] as const
export const RELEASE_TYPES = ['ТВ', 'ONA', 'OVA', 'Фильм'] as const
export const AGE_RATINGS = ['0+', '6+', '12+', '16+', '18+'] as const
export const RELEASE_STATUSES = ['ongoing', 'completed', 'announced'] as const

const MAX_PAGE = 100
const clampLimit = (limit?: number | null) => Math.min(Math.max(limit ?? 30, 1), MAX_PAGE)
const clampOffset = (offset?: number | null) => Math.max(offset ?? 0, 0)

const text = (value?: string | null, max = 200) => (value ?? '').trim().slice(0, max)

const oneOf = <T extends string>(value: string, allowed: readonly T[], field: string): T => {
  if (!(allowed as readonly string[]).includes(value)) {
    throw createGraphQLError(`Недопустимое значение поля «${field}»`)
  }
  return value as T
}

const validDate = (value: Date | null | undefined, field: string): Date => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) throw createGraphQLError(`Недопустимая дата в поле «${field}»`)
  return date
}

export interface AnimeReleaseInput {
  id?: number | null
  title: string
  originalTitle?: string | null
  description?: string | null
  year: number
  season: string
  type: string
  ageRating: string
  status: string
  franchise?: string | null
  isPublished?: boolean | null
  poster?: File | null
  preview?: File | null
  genres?: string[] | null
}

export interface AnimeEpisodeInput {
  id?: number | null
  releaseId: number
  number: number
  title?: string | null
  description?: string | null
  duration?: string | null
  publishedAt?: Date | null
  video?: File | null
  preview?: File | null
}

export interface AnimeScheduleInput {
  id?: number | null
  releaseId: number
  episodeNumber: number
  airAt: Date
}

/** Поля релиза, которые нужны карточкам каталога. */
const releaseInclude = {
  genres: { orderBy: { name: 'asc' } },
  _count: { select: { episodes: true } },
  episodes: { orderBy: { number: 'desc' }, take: 1 },
} satisfies Prisma.AnimeReleaseInclude

/**
 * Добавляет к релизу поля, которые GraphQL объявляет обязательными, но для конкретного
 * запроса они не нужны: genres, episodes, episodesCount, latestEpisode, nextEpisode.
 */
const viewRelease = <T extends object>(release: T) => {
  const row = release as T & {
    genres?: unknown[]
    episodes?: { number: number }[]
    schedule?: { airAt: Date }[]
    _count?: { episodes: number }
    latestEpisode?: unknown
    nextEpisode?: unknown
  }
  const episodes = Array.isArray(row.episodes) ? row.episodes : []
  const schedule = Array.isArray(row.schedule) ? row.schedule : []
  return {
    ...row,
    genres: row.genres ?? [],
    episodes,
    episodesCount: row._count?.episodes ?? episodes.length,
    latestEpisode: row.latestEpisode ?? episodes[0] ?? null,
    nextEpisode: row.nextEpisode ?? schedule[0] ?? null,
  }
}

const viewEpisode = <T extends { release: object }>(episode: T) => ({
  ...episode,
  release: viewRelease(episode.release),
})

const viewSchedule = <T extends { release: object }>(entry: T) => ({
  ...entry,
  release: viewRelease(entry.release),
})

class AnimeService {
  private storage = new AnimeStorageService(storagePath)

  private async releaseExists(id: number) {
    const release = await prisma.animeRelease.findUnique({ where: { id }, select: { id: true } })
    if (!release) throw createGraphQLError('Релиз не найден')
  }

  /** Создаёт или обновляет жанры из списка названий. Регистр не важен: «Экшен» и «экшен» — один жанр. */
  private async resolveGenres(names?: string[] | null) {
    const clean = [...new Set((names ?? []).map((name) => text(name, 40)).filter(Boolean))].slice(0, 12)
    const genres: { id: number }[] = []
    for (const name of clean) {
      const existing = await prisma.animeGenre.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      })
      const genre = existing ?? (await prisma.animeGenre.create({ data: { name }, select: { id: true } }))
      genres.push(genre)
    }
    return genres.map((genre) => ({ id: genre.id }))
  }

  /** Картинка, которую заменили, удаляется только если её больше не использует другой релиз. */
  private async removeImageIfUnused(image: string) {
    if (!image) return
    const used = await prisma.animeRelease.findFirst({
      where: { OR: [{ poster: image }, { preview: image }] },
      select: { id: true },
    })
    if (used) return
    await this.storage.removeImage(image)
  }

  // | ----------------> ПУБЛИЧНЫЙ КАТАЛОГ <---------------- |

  /** Всё для главной страницы каталога одним запросом: эпизоды, расписание, жанры и франшизы. */
  async home(from: Date, to: Date) {
    const rangeFrom = validDate(from, 'from')
    const rangeTo = validDate(to, 'to')

    const [newEpisodes, videos, schedule, genres, franchiseGroups] = await Promise.all([
      prisma.animeEpisode.findMany({
        where: { release: { isPublished: true } },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 4,
        include: { release: { include: { genres: true } } },
      }),
      prisma.animeEpisode.findMany({
        where: { video: { not: '' }, preview: { not: '' }, release: { isPublished: true } },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 3,
        include: { release: { include: { genres: true } } },
      }),
      prisma.animeScheduleEntry.findMany({
        where: { airAt: { gte: rangeFrom, lte: rangeTo }, release: { isPublished: true } },
        orderBy: { airAt: 'asc' },
        include: { release: { include: releaseInclude } },
      }),
      prisma.animeGenre.findMany({
        where: { releases: { some: { isPublished: true } } },
        orderBy: { name: 'asc' },
        include: { _count: { select: { releases: true } } },
      }),
      prisma.animeRelease.groupBy({
        by: ['franchise'],
        where: { isPublished: true, franchise: { not: '' } },
        _min: { year: true },
        _max: { year: true },
        _count: { _all: true },
      }),
    ])

    const franchises = await Promise.all(
      franchiseGroups.map(async (group) => {
        const [latest, episodesCount] = await Promise.all([
          prisma.animeRelease.findFirst({
            where: { isPublished: true, franchise: group.franchise },
            orderBy: [{ year: 'desc' }, { id: 'desc' }],
            select: { poster: true, preview: true },
          }),
          prisma.animeEpisode.count({ where: { release: { isPublished: true, franchise: group.franchise } } }),
        ])
        return {
          name: group.franchise,
          poster: latest?.poster ?? '',
          firstYear: group._min.year ?? 0,
          lastYear: group._max.year ?? 0,
          releasesCount: group._count._all,
          episodesCount,
        }
      }),
    )

    return {
      newEpisodes: newEpisodes.map(viewEpisode),
      videos: videos.map(viewEpisode),
      schedule: schedule.map(viewSchedule),
      genres: genres.map((genre) => ({
        id: genre.id,
        name: genre.name,
        releasesCount: genre._count.releases,
      })),
      franchises,
    }
  }

  /** Записи расписания за промежуток: по ним строятся вкладки «Вчера/Сегодня/Завтра». */
  async schedule(from: Date, to: Date) {
    const entries = await prisma.animeScheduleEntry.findMany({
      where: { airAt: { gte: validDate(from, 'from'), lte: validDate(to, 'to') }, release: { isPublished: true } },
      orderBy: { airAt: 'asc' },
      include: { release: { include: releaseInclude } },
    })
    return entries.map(viewSchedule)
  }

  /** Один релиз со всеми сериями и расписанием для страницы просмотра. */
  async release(id: number) {
    const release = await prisma.animeRelease.findFirst({
      where: { id, isPublished: true },
      include: {
        genres: { orderBy: { name: 'asc' } },
        episodes: { orderBy: { number: 'desc' } },
        schedule: { orderBy: { airAt: 'asc' } },
        _count: { select: { episodes: true } },
      },
    })
    if (!release) return null
    return viewRelease(release)
  }

  // | ----------------> АДМИНКА <---------------- |

  async adminReleases(search?: string | null, limit?: number | null, offset?: number | null) {
    const query = text(search, 100)
    const releases = await prisma.animeRelease.findMany({
      where: query
        ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { originalTitle: { contains: query, mode: 'insensitive' } }] }
        : {},
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: clampLimit(limit),
      skip: clampOffset(offset),
      include: releaseInclude,
    })
    return releases.map(viewRelease)
  }

  async adminSchedule(limit?: number | null) {
    const entries = await prisma.animeScheduleEntry.findMany({
      orderBy: { airAt: 'asc' },
      take: clampLimit(limit ?? 200),
      include: { release: { include: releaseInclude } },
    })
    return entries.map(viewSchedule)
  }

  async adminGenres() {
    const genres = await prisma.animeGenre.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { releases: true } } },
    })
    return genres.map((genre) => ({ id: genre.id, name: genre.name, releasesCount: genre._count.releases }))
  }

  /** Создание и редактирование релиза. Постер обязателен только при создании. */
  async saveRelease(input: AnimeReleaseInput) {
    const title = text(input.title, 200)
    if (!title) throw createGraphQLError('Укажите название релиза')
    const year = Math.trunc(input.year)
    if (!Number.isFinite(year) || year < 1900 || year > 2100) throw createGraphQLError('Год должен быть от 1900 до 2100')
    const season = oneOf(input.season, SEASONS, 'season')
    const type = oneOf(input.type, RELEASE_TYPES, 'type')
    const ageRating = oneOf(input.ageRating, AGE_RATINGS, 'ageRating')
    const status = oneOf(input.status, RELEASE_STATUSES, 'status')

    const existing = input.id
      ? await prisma.animeRelease.findUnique({ where: { id: input.id }, select: { id: true, poster: true, preview: true } })
      : null
    if (input.id && !existing) throw createGraphQLError('Релиз не найден')
    if (!existing && !input.poster) throw createGraphQLError('Загрузите постер')

    let poster: { high: string } | null = null
    let preview: { high: string } | null = null
    try {
      if (input.poster) poster = await this.storage.saveImage(input.poster, 'posters')
      if (input.preview) preview = await this.storage.saveImage(input.preview, 'previews')

      const genres = await this.resolveGenres(input.genres)
      const genreLinks = genres.map((genre) => ({ id: genre.id }))
      const data = {
        title,
        originalTitle: text(input.originalTitle, 200),
        description: text(input.description, 5000),
        year,
        season,
        type,
        ageRating,
        status,
        franchise: text(input.franchise, 120),
        isPublished: input.isPublished ?? true,
        ...(poster ? { poster: poster.high } : {}),
        ...(preview ? { preview: preview.high } : {}),
      }

      const release = existing
        ? await prisma.animeRelease.update({
            where: { id: existing.id },
            data: { ...data, genres: { set: genreLinks } },
            include: releaseInclude,
          })
        : await prisma.animeRelease.create({
            data: {
              ...data,
              poster: poster ? poster.high : '',
              preview: preview?.high ?? '',
              genres: { connect: genreLinks },
            },
            include: releaseInclude,
          })

      // Старые картинки убираем после успешной записи: при ошибке файлы остаются рабочими
      if (poster && existing?.poster && existing.poster !== poster.high) {
        await this.removeImageIfUnused(existing.poster)
      }
      if (preview && existing?.preview && existing.preview !== preview.high) {
        await this.removeImageIfUnused(existing.preview)
      }
      return viewRelease(release)
    } catch (error) {
      // Новые файлы при ошибке не нужны: база на них не ссылается
      if (poster) await this.storage.removeImage(poster.high)
      if (preview) await this.storage.removeImage(preview.high)
      throw error
    }
  }

  /** Удаляет релиз вместе с сериями и расписанием. */
  async deleteRelease(id: number) {
    const release = await prisma.animeRelease.findUnique({
      where: { id },
      include: { episodes: { select: { video: true, preview: true } } },
    })
    if (!release) throw createGraphQLError('Релиз не найден')

    await prisma.animeRelease.delete({ where: { id } })
    await this.storage.removeImage(release.poster)
    if (release.preview) await this.storage.removeImage(release.preview)
    for (const episode of release.episodes) {
      if (episode.video) await this.storage.removeVideo(episode.video)
      if (episode.preview) await this.storage.removeImage(episode.preview)
    }
    return true
  }

  /** Добавляет или изменяет серию. При сохранении серия убирается из расписания как вышедшая. */
  async saveEpisode(input: AnimeEpisodeInput) {
    await this.releaseExists(input.releaseId)
    const number = Math.trunc(input.number)
    if (!Number.isFinite(number) || number < 1 || number > 9999) throw createGraphQLError('Номер серии должен быть от 1')
    const duration = text(input.duration, 10)
    if (duration && !/^\d{1,3}:[0-5]\d$/.test(duration)) {
      throw createGraphQLError('Длительность укажите как «24:00»')
    }

    const existing = input.id
      ? await prisma.animeEpisode.findUnique({ where: { id: input.id } })
      : null
    if (input.id && !existing) throw createGraphQLError('Серия не найдена')
    if (!existing && !input.video) throw createGraphQLError('Загрузите видео серии')

    const sameNumber = await prisma.animeEpisode.findUnique({
      where: { releaseId_number: { releaseId: input.releaseId, number } },
      select: { id: true },
    })
    if (sameNumber && sameNumber.id !== existing?.id) throw createGraphQLError('Серия с таким номером уже есть')

    let video: { file: string } | null = null
    let preview: { high: string } | null = null
    if (input.video) video = await this.storage.saveVideo(input.video)
    if (input.preview) preview = await this.storage.saveImage(input.preview, 'previews')

    const data = {
      releaseId: input.releaseId,
      number,
      title: text(input.title, 200),
      description: text(input.description, 2000),
      duration,
      publishedAt: validDate(input.publishedAt, 'publishedAt'),
      ...(video ? { video: video.file } : {}),
      ...(preview ? { preview: preview.high } : {}),
    }

    let episode: { id: number }
    try {
      episode = existing
        ? await prisma.animeEpisode.update({ where: { id: existing.id }, data })
        : await prisma.animeEpisode.create({
            data: { ...data, video: video ? video.file : '', preview: preview?.high ?? '' },
          })
    } catch (error) {
      // Файлы сохраняются до записи в БД: при ошибке убираем их, чтобы не копить мусор
      if (video) await this.storage.removeVideo(video.file)
      if (preview) await this.storage.removeImage(preview.high)
      throw error
    }

    // Серия вышла: из расписания её убираем
    await prisma.animeScheduleEntry.deleteMany({ where: { releaseId: input.releaseId, episodeNumber: number } })

    if (video && existing?.video && existing.video !== video.file) await this.storage.removeVideo(existing.video)
    if (preview && existing?.preview && existing.preview !== preview.high) {
      await this.storage.removeImage(existing.preview)
    }

    const saved = await prisma.animeEpisode.findUniqueOrThrow({
      where: { id: episode.id },
      include: { release: { include: { genres: true } } },
    })
    return viewEpisode(saved)
  }

  async deleteEpisode(id: number) {
    const episode = await prisma.animeEpisode.findUnique({ where: { id } })
    if (!episode) throw createGraphQLError('Серия не найдена')
    await prisma.animeEpisode.delete({ where: { id } })
    if (episode.video) await this.storage.removeVideo(episode.video)
    if (episode.preview) await this.storage.removeImage(episode.preview)
    return true
  }

  /** Планирует выход серии. Повторная запись для той же серии заменяет дату. */
  async saveSchedule(input: AnimeScheduleInput) {
    await this.releaseExists(input.releaseId)
    const episodeNumber = Math.trunc(input.episodeNumber)
    if (!Number.isFinite(episodeNumber) || episodeNumber < 1 || episodeNumber > 9999) {
      throw createGraphQLError('Номер серии должен быть от 1')
    }
    const airAt = validDate(input.airAt, 'airAt')

    const entry = await prisma.animeScheduleEntry.upsert({
      where: { releaseId_episodeNumber: { releaseId: input.releaseId, episodeNumber } },
      create: { releaseId: input.releaseId, episodeNumber, airAt },
      update: { airAt },
      include: { release: { include: releaseInclude } },
    })
    return viewSchedule(entry)
  }

  async deleteSchedule(id: number) {
    const entry = await prisma.animeScheduleEntry.findUnique({ where: { id }, select: { id: true } })
    if (!entry) throw createGraphQLError('Запись расписания не найдена')
    await prisma.animeScheduleEntry.delete({ where: { id } })
    return true
  }

  /** Жанр удаляется только когда его не использует ни один релиз. */
  async deleteGenre(id: number) {
    const genre = await prisma.animeGenre.findUnique({
      where: { id },
      include: { _count: { select: { releases: true } } },
    })
    if (!genre) throw createGraphQLError('Жанр не найден')
    if (genre._count.releases > 0) throw createGraphQLError('Жанр используется релизами')
    await prisma.animeGenre.delete({ where: { id } })
    return true
  }

  /** Серии релиза для админки (включая черновики). */
  async adminEpisodes(releaseId: number) {
    await this.releaseExists(releaseId)
    const episodes = await prisma.animeEpisode.findMany({
      where: { releaseId },
      orderBy: { number: 'desc' },
      include: { release: { include: { genres: true } } },
    })
    return episodes.map(viewEpisode)
  }
}

export default new AnimeService()

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin } from '@/api/anime/access'
import AnimeService from '@/api/anime/service'
import UserController from '@/api/user/controller'
import { canAccessFile } from '@/api/storage/access'

import { prisma, resetDb } from './helpers'

// Файлы в тестах не пишем на диск: заглушка запоминает сохранённое и удалённое
const files = vi.hoisted(() => ({
  saved: [] as string[],
  removed: [] as string[],
  videos: [] as string[],
  removedVideos: [] as string[],
}))

vi.mock('@/api/anime/anime-storage', () => {
  let n = 0
  class AnimeStorageService {
    async saveImage() {
      n += 1
      const high = `anime/posters/img${n}`
      files.saved.push(high)
      return { high, medium: high, small: high, vertical: false, type: 'webp' }
    }
    async saveVideo() {
      n += 1
      const file = `anime/videos/video${n}.mp4`
      files.videos.push(file)
      return { file, size: 10, type: 'video/mp4', title: 'серия' }
    }
    async removeImage(image: string) {
      files.removed.push(image)
    }
    async removeVideo(file: string) {
      files.removedVideos.push(file)
    }
  }
  return { default: AnimeStorageService }
})

const image = (name = 'poster.webp') => new File(['x'], name, { type: 'image/webp' })
const video = (name = 'episode.mp4') => new File(['x'], name, { type: 'video/mp4' })

const releaseInput = (overrides: Record<string, unknown> = {}) => ({
  title: 'Тестовый релиз',
  year: 2026,
  season: 'Осень',
  type: 'ТВ',
  ageRating: '16+',
  status: 'ongoing',
  genres: ['Экшен'],
  poster: image(),
  ...overrides,
})

/** Релиз прямой записью в БД: там, где загрузка постера не проверяется. */
const createRelease = async (extra: Record<string, unknown> = {}) =>
  prisma.animeRelease.create({
    data: {
      title: 'Релиз',
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      ageRating: '16+',
      poster: 'anime/posters/seed',
      isPublished: true,
      ...extra,
    },
  })

beforeEach(async () => {
  await resetDb()
  vi.restoreAllMocks()
  files.saved.length = 0
  files.removed.length = 0
  files.videos.length = 0
  files.removedVideos.length = 0
})

describe('доступ администратора', () => {
  it('пускает только администратора с подтверждённой почтой', async () => {
    vi.spyOn(UserController, 'refresh').mockResolvedValue({ id: 1, role: 'user', isActivated: true } as never)
    await expect(requireAdmin({ cookies: {} } as never, {} as never)).rejects.toThrow('Нет доступа')

    vi.spyOn(UserController, 'refresh').mockResolvedValue({ id: 1, role: 'admin', isActivated: false } as never)
    await expect(requireAdmin({ cookies: {} } as never, {} as never)).rejects.toThrow('Подтвердите')

    vi.spyOn(UserController, 'refresh').mockResolvedValue({ id: 1, role: 'admin', isActivated: true } as never)
    await expect(requireAdmin({ cookies: {} } as never, {} as never)).resolves.toMatchObject({ id: 1 })
  })
})

describe('релизы', () => {
  it('создаёт релиз с постером, превью и жанрами', async () => {
    const release = await AnimeService.saveRelease(
      releaseInput({ preview: image('preview.webp'), genres: ['Экшен', 'Фэнтези'] }),
    )

    expect(release).toMatchObject({ title: 'Тестовый релиз', year: 2026, isPublished: true, episodesCount: 0 })
    expect(release.genres.map((genre) => genre.name).sort()).toEqual(['Фэнтези', 'Экшен'])
    expect(files.saved).toHaveLength(2)
    const stored = await prisma.animeRelease.findUniqueOrThrow({ where: { id: release.id } })
    expect(stored.poster).toBe(files.saved[0])
    expect(stored.preview).toBe(files.saved[1])
  })

  it('без постера создать нельзя, а при изменении постер не обязателен', async () => {
    await expect(AnimeService.saveRelease(releaseInput({ poster: null }))).rejects.toThrow('Загрузите постер')

    const release = await AnimeService.saveRelease(releaseInput())
    const poster = release.poster
    const updated = await AnimeService.saveRelease(releaseInput({ id: release.id, poster: null, title: 'Новое имя' }))
    expect(updated.title).toBe('Новое имя')
    expect(updated.poster).toBe(poster)
    expect(files.removed).toHaveLength(0)
  })

  it('заменяет жанры и убирает старые картинки, когда на них больше никто не ссылается', async () => {
    const release = await AnimeService.saveRelease(releaseInput({ genres: ['Экшен'] }))
    await AnimeService.saveRelease(releaseInput({ id: release.id, genres: ['Драма'], poster: image('new.webp') }))

    const genres = await prisma.animeGenre.findMany({ orderBy: { name: 'asc' } })
    expect(genres.map((genre) => genre.name)).toEqual(['Драма', 'Экшен'])
    // Экшен остался без релизов, но не удаляется автоматически: это отдельная сущность каталога
    expect(await prisma.animeGenre.count()).toBe(2)
    expect(files.removed).toContain(release.poster)
  })

  it('проверяет сезон, тип, возраст и год', async () => {
    await expect(AnimeService.saveRelease(releaseInput({ season: 'Лета' }))).rejects.toThrow('season')
    await expect(AnimeService.saveRelease(releaseInput({ type: 'Сериал' }))).rejects.toThrow('type')
    await expect(AnimeService.saveRelease(releaseInput({ ageRating: '21+' }))).rejects.toThrow('ageRating')
    await expect(AnimeService.saveRelease(releaseInput({ year: 1800 }))).rejects.toThrow('1900')
  })

  it('удаляет релиз вместе с постером, превью, сериями и их видео', async () => {
    const release = await AnimeService.saveRelease(releaseInput({ preview: image('p.webp') }))
    const episode = await AnimeService.saveEpisode({
      releaseId: release.id,
      number: 1,
      video: video(),
      preview: image('frame.webp'),
    })
    await AnimeService.saveSchedule({ releaseId: release.id, episodeNumber: 2, airAt: new Date() })

    await AnimeService.deleteRelease(release.id)

    expect(await prisma.animeRelease.count()).toBe(0)
    expect(await prisma.animeEpisode.count()).toBe(0)
    expect(await prisma.animeScheduleEntry.count()).toBe(0)
    expect(files.removed).toEqual(expect.arrayContaining([release.poster, release.preview, episode.preview]))
    expect(files.removedVideos).toContain(episode.video)
  })
})

describe('серии', () => {
  it('сохраняет серию и убирает её из расписания как вышедшую', async () => {
    const release = await createRelease()
    await AnimeService.saveSchedule({ releaseId: release.id, episodeNumber: 3, airAt: new Date() })

    const episode = await AnimeService.saveEpisode({
      releaseId: release.id,
      number: 3,
      title: 'Финал',
      duration: '24:30',
      video: video(),
      preview: image('frame.webp'),
    })

    expect(episode).toMatchObject({ number: 3, title: 'Финал', duration: '24:30' })
    expect(episode.release.id).toBe(release.id)
    expect(episode.video).toMatch(/^anime\/videos\//)
    expect(await prisma.animeScheduleEntry.count()).toBe(0)
  })

  it('не даёт дублировать номер серии и кривую длительность', async () => {
    const release = await createRelease()
    await AnimeService.saveEpisode({ releaseId: release.id, number: 4, video: video() })

    await expect(AnimeService.saveEpisode({ releaseId: release.id, number: 4, video: video() })).rejects.toThrow(
      'уже есть',
    )
    await expect(
      AnimeService.saveEpisode({ releaseId: release.id, number: 5, duration: '25 минут', video: video() }),
    ).rejects.toThrow('24:00')
  })

  it('требует видео при создании, но не при изменении', async () => {
    const release = await createRelease()
    await expect(AnimeService.saveEpisode({ releaseId: release.id, number: 1 })).rejects.toThrow('Загрузите видео')

    const episode = await AnimeService.saveEpisode({ releaseId: release.id, number: 1, video: video() })
    const updated = await AnimeService.saveEpisode({ releaseId: release.id, id: episode.id, number: 1, title: 'Имя' })
    expect(updated.title).toBe('Имя')
    expect(updated.video).toBe(episode.video)
  })

  it('удаляет файлы серии при удалении', async () => {
    const release = await createRelease()
    const episode = await AnimeService.saveEpisode({
      releaseId: release.id,
      number: 1,
      video: video(),
      preview: image('frame.webp'),
    })

    await AnimeService.deleteEpisode(episode.id)
    expect(files.removedVideos).toContain(episode.video)
    expect(files.removed).toContain(episode.preview)
    expect(await prisma.animeEpisode.count()).toBe(0)
  })
})

describe('расписание и жанры', () => {
  it('повторная запись расписания заменяет дату, удаление убирает запись', async () => {
    const release = await createRelease()
    const first = await AnimeService.saveSchedule({
      releaseId: release.id,
      episodeNumber: 7,
      airAt: new Date('2026-11-20T18:00:00Z'),
    })
    const second = await AnimeService.saveSchedule({
      releaseId: release.id,
      episodeNumber: 7,
      airAt: new Date('2026-11-21T18:00:00Z'),
    })

    expect(second.id).toBe(first.id)
    expect(await prisma.animeScheduleEntry.count()).toBe(1)
    expect(second.release.id).toBe(release.id)

    await AnimeService.deleteSchedule(second.id)
    expect(await prisma.animeScheduleEntry.count()).toBe(0)
  })

  it('жанр удаляется, только если его не использует ни один релиз', async () => {
    const release = await AnimeService.saveRelease(releaseInput({ genres: ['Экшен'] }))
    const genre = (await prisma.animeGenre.findFirstOrThrow({ where: { name: 'Экшен' } })).id

    await expect(AnimeService.deleteGenre(genre)).rejects.toThrow('используется')
    await AnimeService.deleteRelease(release.id)
    await expect(AnimeService.deleteGenre(genre)).resolves.toBe(true)
  })
})

describe('публичный каталог', () => {
  it('не показывает черновики в новых сериях, расписании и на странице релиза', async () => {
    const published = await createRelease({ title: 'Виден' })
    const draft = await createRelease({ title: 'Черновик', isPublished: false })

    await AnimeService.saveEpisode({ releaseId: published.id, number: 1, video: video(), publishedAt: new Date() })
    await AnimeService.saveEpisode({ releaseId: draft.id, number: 1, video: video(), publishedAt: new Date() })
    await AnimeService.saveSchedule({ releaseId: published.id, episodeNumber: 2, airAt: new Date() })
    await AnimeService.saveSchedule({ releaseId: draft.id, episodeNumber: 2, airAt: new Date() })

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const home = await AnimeService.home(from, to)

    expect(home.newEpisodes.map((episode) => episode.release.title)).toEqual(['Виден'])
    expect(home.schedule.map((entry) => entry.release.title)).toEqual(['Виден'])
    expect((await AnimeService.release(published.id))?.title).toBe('Виден')
    expect(await AnimeService.release(draft.id)).toBeNull()
  })

  it('файлы каталога аниме открыты без входа', async () => {
    expect(await canAccessFile('anime/posters/cyberpunk.webp')).toBe(true)
    expect(await canAccessFile('anime/videos/demo.mp4')).toBe(true)
  })
})

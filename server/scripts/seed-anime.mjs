/**
 * Наполняет каталог аниме демонстрационными данными: релизы, жанры, серии и расписание.
 *
 *   npm run seed:anime
 *
 * Скрипт полностью заменяет содержимое каталога аниме (релизы, серии, расписание, жанры).
 * Постеры и кадры копируются из `client/public/anime` в `server/storage/anime`, поэтому
 * страница каталога сразу выглядит как раньше, но данные приходят из базы.
 *
 * Видео для демо-серий берётся из первого mp4 в `server/storage/videos` (если он есть):
 * в репозитории нет видеоматериалов, а браузеру нужен настоящий файл для плеера.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const storageDir = path.resolve(scriptDir, '../storage')
const animeDir = path.join(storageDir, 'anime')
const clientAnimeDir = path.resolve(scriptDir, '../../client/public/anime')

const DEMO_VIDEO = 'anime/videos/demo-episode.mp4'

/** Копирует картинку в открытый каталог аниме под новым именем; возвращает путь без расширения. */
const copyImage = async (kind, source, slug) => {
  const targetDir = path.join(animeDir, kind)
  await mkdir(targetDir, { recursive: true })
  const target = path.join(targetDir, `${slug}.webp`)
  await copyFile(path.join(clientAnimeDir, source), target)
  return `anime/${kind}/${slug}`
}

const copyDemoVideo = async () => {
  const videosDir = path.join(storageDir, 'videos')
  let files = []
  try {
    files = (await readdir(videosDir)).filter((name) => name.endsWith('.mp4'))
  } catch {
    return ''
  }
  if (files.length === 0) return ''
  const source = path.join(videosDir, files[0])
  const target = path.join(animeDir, 'videos')
  await mkdir(target, { recursive: true })
  await copyFile(source, path.join(storageDir, DEMO_VIDEO))
  return DEMO_VIDEO
}

const dayAt = (offset, hours, minutes = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000)

/** Основные релизы каталога: то, что видно на главной странице аниме. */
const releases = [
  {
    slug: 'cyberpunk',
    title: 'Киберпанк: Бегущие по краю 2',
    originalTitle: 'Cyberpunk: Edgerunners 2',
    description:
      'Найт-Сити не стал добрее. Новые наёмники пытаются выжить в городе, где мечты продаются по частям, а корпорации не оставляют долгов.',
    year: 2026,
    season: 'Осень',
    type: 'ONA',
    ageRating: '18+',
    status: 'ongoing',
    franchise: 'Киберпанк',
    genres: ['Фантастика', 'Экшен', 'Киберпанк'],
    poster: 'poster-cyberpunk.webp',
    preview: 'ep-cyberpunk.webp',
    episode: { number: 10, title: 'Эпизод 10', duration: '30:13', video: true, publishedAt: hoursAgo(2) },
  },
  {
    slug: 'jojo',
    title: 'Невероятные приключения ДжоДжо: Гонка «Стальной шар»',
    originalTitle: 'JoJo no Kimyou na Bouken: Steel Ball Run',
    description:
      'Гонка через весь континент: приз огромен, но у каждого всадника свой счёт к судьбе. Джонни и Джайро ищут не только финиш.',
    year: 2026,
    season: 'Весна',
    type: 'ONA',
    ageRating: '16+',
    status: 'ongoing',
    franchise: 'ДжоДжо',
    genres: ['Сейнен', 'Экшен', 'Приключения', 'Детектив', 'Сверхъестественное'],
    poster: 'poster-jojo.webp',
    preview: 'ep-jojo.webp',
    episode: { number: 8, title: 'Эпизод 8', duration: '24:40', video: true, publishedAt: hoursAgo(5) },
  },
  {
    slug: 'mezametara',
    title: 'Я очнулся пилотом сильнейшего космического корабля',
    originalTitle: 'Mezametara Saikyou Soubi to Uchuusen no Moto ni',
    description:
      'Обычный день закончился в кресле пилота корабля, которого не должно существовать. Теперь у героя есть экипаж и очень много проблем.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Фантастика', 'Экшен', 'Исекай'],
    poster: 'poster-mezametara.webp',
    preview: 'ep-mezametara.webp',
    episode: { number: 6, title: 'Эпизод 6', duration: '23:55', video: true, publishedAt: hoursAgo(20) },
  },
  {
    slug: 'demons-crest',
    title: 'Герб демонов',
    originalTitle: 'Akuma no Monshou',
    description:
      'Древний герб просыпается в провинциальном городке. Наследникам придётся решить, чья кровь сильнее — человеческая или демоническая.',
    year: 2026,
    season: 'Осень',
    type: 'ONA',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Фэнтези', 'Приключения', 'Экшен'],
    poster: 'poster-demons-crest.webp',
    preview: 'ep-demons-crest.webp',
    episode: { number: 1, title: 'Эпизод 1', duration: '25:10', video: false, publishedAt: hoursAgo(30) },
  },
  {
    slug: 'red-river',
    title: 'Небеса у берегов Красной реки',
    originalTitle: 'Kouka no Sora',
    description: 'История о долге, чести и любви на фоне войны двух речных государств.',
    year: 2026,
    season: 'Лето',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Сёдзе', 'Экшен', 'Приключения', 'Драма', 'Романтика'],
    poster: 'poster-red-river.webp',
  },
  {
    slug: 'brothers',
    title: 'Пожалуйста, простите моих младших братьев',
    originalTitle: 'Otouto-tachi yo, Gomen',
    description: 'Старшая сестра пытается собрать семью заново после того, как дом перестал быть домом.',
    year: 2026,
    season: 'Лето',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Сёдзе', 'Комедия', 'Романтика'],
    poster: 'poster-brothers.webp',
  },
  {
    slug: 'horror-collector',
    title: 'Коллекционер ужасов',
    originalTitle: 'Horror Collector',
    description: 'Каждый экспонат в его коллекции — чья-то история, которую очень хотели забыть.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Ужасы', 'Сверхъестественное', 'Детектив'],
    poster: 'poster-horror-collector.webp',
  },
  {
    slug: 'tokyo-revengers',
    title: 'Токийские мстители: Арка Трёх Небожителей',
    originalTitle: 'Tokyo Revengers: Tenjiku Arc',
    description: 'Такэмити снова возвращается в прошлое, чтобы остановить войну, которая ещё не началась.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: 'Токийские мстители',
    genres: ['Сёнен', 'Экшен', 'Драма'],
    poster: 'poster-tokyo-revengers.webp',
    preview: 'ep-tokyo-revengers.webp',
  },
  {
    slug: 'toaru',
    title: 'Некий ITEM тёмной стороны',
    originalTitle: 'Toaru Item no Dark Side',
    description: 'Тёмная сторона Академического города: работа, за которую не дают медалей.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: 'Некий',
    genres: ['Фантастика', 'Экшен'],
    poster: 'poster-toaru.webp',
  },
  {
    slug: 'ao-no-hako',
    title: 'Голубая шкатулка 2',
    originalTitle: 'Ao no Hako 2',
    description: 'Тайи и Тина продолжают путь: спорт, школа и чувства, которые сложнее подачи.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: 'Голубая шкатулка',
    genres: ['Романтика', 'Спорт', 'Сёнен', 'Школа'],
    poster: 'poster-ao-no-hako.webp',
    preview: 'ep-ao-no-hako.webp',
  },
  {
    slug: 'magical-explorer',
    title: 'Магический исследователь',
    originalTitle: 'Magical Explorer',
    description: 'Герой попал в игру, которую знал наизусть. Жаль, что знание сюжета не отменяет плохих решений.',
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    ageRating: '16+',
    status: 'ongoing',
    franchise: '',
    genres: ['Этти', 'Комедия', 'Приключения', 'Гарем'],
    poster: 'poster-magical-explorer.webp',
  },
]

/**
 * Франшизы из демо-страницы: несколько сезонов с общим названием.
 * Серии добавляются без видео — карточка франшизы на главной считает их число.
 */
const franchiseSeasons = [
  {
    franchise: 'Тёмный дворецкий',
    poster: 'franchise-kuroshitsuji.webp',
    genres: ['Сёнен', 'Мистика', 'Драма', 'Комедия'],
    seasons: [
      { title: 'Тёмный дворецкий', originalTitle: 'Kuroshitsuji', year: 2008, episodes: 24 },
      { title: 'Тёмный дворецкий II', originalTitle: 'Kuroshitsuji II', year: 2010, episodes: 12 },
      { title: 'Тёмный дворецкий: Книга цирка', originalTitle: 'Kuroshitsuji: Book of Circus', year: 2014, episodes: 10 },
      { title: 'Тёмный дворецкий: Книга Атлантики', originalTitle: 'Kuroshitsuji: Book of the Atlantic', year: 2024, episodes: 11 },
    ],
  },
  {
    franchise: 'Токийские мстители',
    poster: 'franchise-tokyo-revengers.webp',
    genres: ['Сёнен', 'Экшен', 'Драма'],
    seasons: [
      { title: 'Токийские мстители', originalTitle: 'Tokyo Revengers', year: 2021, episodes: 24 },
      { title: 'Токийские мстители: Рождественская битва', originalTitle: 'Tokyo Revengers: Christmas Showdown', year: 2023, episodes: 13 },
      { title: 'Токийские мстители: Арка Тенджику', originalTitle: 'Tokyo Revengers: Tenjiku Arc', year: 2024, episodes: 12 },
    ],
  },
  {
    franchise: 'Триган',
    poster: 'franchise-trigun.webp',
    genres: ['Сёнен', 'Экшен', 'Фантастика', 'Приключения'],
    seasons: [
      { title: 'Триган', originalTitle: 'Trigun', year: 1998, episodes: 26 },
      { title: 'Триган: Ураган', originalTitle: 'Trigun: Badlands Rumble', year: 2010, episodes: 12 },
      { title: 'Триган: Шторм', originalTitle: 'Trigun Stampede', year: 2023, episodes: 12 },
    ],
  },
]

/** Расписание на вчера, сегодня и завтра: номер серии и время выхода. */
const schedule = [
  { slug: 'red-river', episodeNumber: 18, offset: -1, hours: 18, minutes: 0 },
  { slug: 'brothers', episodeNumber: 18, offset: -1, hours: 19, minutes: 30 },
  { slug: 'horror-collector', episodeNumber: 5, offset: -1, hours: 21, minutes: 0 },
  { slug: 'cyberpunk', episodeNumber: 11, offset: 0, hours: 17, minutes: 0 },
  { slug: 'tokyo-revengers', episodeNumber: 6, offset: 0, hours: 19, minutes: 0 },
  { slug: 'toaru', episodeNumber: 5, offset: 0, hours: 21, minutes: 30 },
  { slug: 'mezametara', episodeNumber: 7, offset: 1, hours: 16, minutes: 0 },
  { slug: 'ao-no-hako', episodeNumber: 5, offset: 1, hours: 18, minutes: 30 },
  { slug: 'magical-explorer', episodeNumber: 7, offset: 1, hours: 20, minutes: 0 },
]

const main = async () => {
  console.log('Каталог аниме: очистка старых данных…')
  await prisma.animeEpisode.deleteMany()
  await prisma.animeScheduleEntry.deleteMany()
  await prisma.animeRelease.deleteMany()
  await prisma.animeGenre.deleteMany()

  const demoVideo = await copyDemoVideo()
  if (!demoVideo) {
    console.log('Видео для демо-серий не найдено (server/storage/videos пуст): серии будут без видео')
  }

  const genres = new Map()
  const genreId = async (name) => {
    const key = name.toLocaleLowerCase('ru')
    if (genres.has(key)) return genres.get(key)
    const genre = await prisma.animeGenre.create({ data: { name } })
    genres.set(key, genre.id)
    return genre.id
  }

  const releaseId = new Map()

  for (const item of releases) {
    const poster = await copyImage('posters', item.poster, item.slug)
    const preview = item.preview ? await copyImage('previews', item.preview, item.slug) : ''
    const links = []
    for (const name of item.genres) links.push({ id: await genreId(name) })

    const release = await prisma.animeRelease.create({
      data: {
        title: item.title,
        originalTitle: item.originalTitle,
        description: item.description,
        year: item.year,
        season: item.season,
        type: item.type,
        ageRating: item.ageRating,
        status: item.status,
        franchise: item.franchise,
        poster,
        preview,
        isPublished: true,
        genres: { connect: links },
      },
      select: { id: true },
    })
    releaseId.set(item.slug, release.id)

    if (item.episode) {
      const episode = item.episode
      await prisma.animeEpisode.create({
        data: {
          releaseId: release.id,
          number: episode.number,
          title: episode.title,
          description: `${item.title} — ${episode.title}.`,
          video: episode.video ? demoVideo : '',
          preview,
          duration: episode.duration,
          publishedAt: episode.publishedAt,
        },
      })
    }
  }

  for (const group of franchiseSeasons) {
    for (const [index, season] of group.seasons.entries()) {
      const slug = `${group.franchise.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-')}-${season.year}`
      const poster = await copyImage('posters', group.poster, slug)
      const links = []
      for (const name of group.genres) links.push({ id: await genreId(name) })

      const release = await prisma.animeRelease.create({
        data: {
          title: season.title,
          originalTitle: season.originalTitle,
          description: `Сезон ${index + 1} франшизы «${group.franchise}».`,
          year: season.year,
          season: 'Зима',
          type: 'ТВ',
          ageRating: '16+',
          status: season.year < 2026 ? 'completed' : 'ongoing',
          franchise: group.franchise,
          poster,
          preview: '',
          isPublished: true,
          genres: { connect: links },
        },
        select: { id: true },
      })
      releaseId.set(slug, release.id)

      const publishedAt = new Date(Date.UTC(season.year, 0, 1))
      await prisma.animeEpisode.createMany({
        data: Array.from({ length: season.episodes }, (_, i) => ({
          releaseId: release.id,
          number: i + 1,
          title: `Эпизод ${i + 1}`,
          description: '',
          video: '',
          preview: '',
          duration: '',
          publishedAt: new Date(publishedAt.getTime() + i * 7 * 24 * 60 * 60 * 1000),
        })),
        skipDuplicates: true,
      })
    }
  }

  for (const entry of schedule) {
    await prisma.animeScheduleEntry.create({
      data: {
        releaseId: releaseId.get(entry.slug),
        episodeNumber: entry.episodeNumber,
        airAt: dayAt(entry.offset, entry.hours, entry.minutes),
      },
    })
  }

  const [releaseCount, episodeCount, scheduleCount, genreCount] = await Promise.all([
    prisma.animeRelease.count(),
    prisma.animeEpisode.count(),
    prisma.animeScheduleEntry.count(),
    prisma.animeGenre.count(),
  ])
  console.log(
    `Готово: релизов ${releaseCount}, серий ${episodeCount}, записей расписания ${scheduleCount}, жанров ${genreCount}`,
  )
  if (demoVideo) console.log(`Демо-видео: /storage/${demoVideo}`)
}

main()
  .catch((error) => {
    console.error('Не удалось наполнить каталог аниме:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

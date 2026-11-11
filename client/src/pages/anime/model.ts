/**
 * Демо-каталог страницы «Аниме».
 *
 * Пока на сервере нет моделей релизов, расписания и жанров, данные и постеры лежат
 * здесь и в `client/public/anime`. Когда появится каталог, эти массивы заменяются
 * запросами GraphQL, а разметка остаётся прежней.
 */

export type Release = {
  id: string
  title: string
  poster: string
  episode: number
  year: number
  season: string
  type: string
  age: string
  genres: string[]
}

export type NewEpisode = Release & { preview: string }

export type ScheduleDay = 'yesterday' | 'today' | 'tomorrow'

export const SCHEDULE_DAYS: Array<{ id: ScheduleDay; label: string }> = [
  { id: 'yesterday', label: 'Вчера' },
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
]

const meta = (release: Release) => `${release.year} • ${release.season} • ${release.type} • ${release.age}`

export const releaseMeta = meta

export const newEpisodes: NewEpisode[] = [
  {
    id: 'cyberpunk-2',
    title: 'Киберпанк: Бегущие по краю 2',
    poster: '/anime/poster-cyberpunk.webp',
    preview: '/anime/ep-cyberpunk.webp',
    episode: 10,
    year: 2026,
    season: 'Осень',
    type: 'ONA',
    age: '18+',
    genres: ['Фантастика', 'Экшен', 'Киберпанк'],
  },
  {
    id: 'jojo-steel-ball-run',
    title: 'Невероятные приключения ДжоДжо: Гонка «Стальной шар»',
    poster: '/anime/poster-jojo.webp',
    preview: '/anime/ep-jojo.webp',
    episode: 8,
    year: 2026,
    season: 'Весна',
    type: 'ONA',
    age: '16+',
    genres: ['Сейнен', 'Экшен', 'Приключения', 'Детектив', 'Сверхъестественное'],
  },
  {
    id: 'mezametara',
    title: 'Я очнулся пилотом сильнейшего космического корабля',
    poster: '/anime/poster-mezametara.webp',
    preview: '/anime/ep-mezametara.webp',
    episode: 6,
    year: 2026,
    season: 'Осень',
    type: 'ТВ',
    age: '16+',
    genres: ['Фантастика', 'Экшен', 'Исекай'],
  },
  {
    id: 'demons-crest',
    title: 'Герб демонов',
    poster: '/anime/poster-demons-crest.webp',
    preview: '/anime/ep-demons-crest.webp',
    episode: 1,
    year: 2026,
    season: 'Осень',
    type: 'ONA',
    age: '16+',
    genres: ['Фэнтези', 'Приключения', 'Экшен'],
  },
]

export const schedule: Record<ScheduleDay, Release[]> = {
  yesterday: [
    {
      id: 'red-river',
      title: 'Небеса у берегов Красной реки',
      poster: '/anime/poster-red-river.webp',
      episode: 18,
      year: 2026,
      season: 'Лето',
      type: 'ТВ',
      age: '16+',
      genres: ['Сёдзе', 'Экшен', 'Приключения', 'Драма', 'Романтика'],
    },
    {
      id: 'brothers',
      title: 'Пожалуйста, простите моих младших братьев',
      poster: '/anime/poster-brothers.webp',
      episode: 18,
      year: 2026,
      season: 'Лето',
      type: 'ТВ',
      age: '16+',
      genres: ['Сёдзе', 'Комедия', 'Романтика'],
    },
    {
      id: 'horror-collector',
      title: 'Коллекционер ужасов',
      poster: '/anime/poster-horror-collector.webp',
      episode: 5,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Ужасы', 'Сверхъестественное', 'Детектив'],
    },
  ],
  today: [
    {
      id: 'cyberpunk-today',
      title: 'Киберпанк: Бегущие по краю 2',
      poster: '/anime/poster-cyberpunk.webp',
      episode: 10,
      year: 2026,
      season: 'Осень',
      type: 'ONA',
      age: '18+',
      genres: ['Фантастика', 'Экшен', 'Киберпанк'],
    },
    {
      id: 'tokyo-revengers',
      title: 'Токийские мстители: Арка Трёх Небожителей',
      poster: '/anime/poster-tokyo-revengers.webp',
      episode: 6,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Сёнен', 'Экшен', 'Драма'],
    },
    {
      id: 'toaru-item',
      title: 'Некий ITEM тёмной стороны',
      poster: '/anime/poster-toaru.webp',
      episode: 5,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Фантастика', 'Экшен'],
    },
  ],
  tomorrow: [
    {
      id: 'mezametara-tomorrow',
      title: 'Я очнулся пилотом сильнейшего космического корабля',
      poster: '/anime/poster-mezametara.webp',
      episode: 6,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Фантастика', 'Экшен', 'Исекай'],
    },
    {
      id: 'ao-no-hako',
      title: 'Голубая шкатулка 2',
      poster: '/anime/poster-ao-no-hako.webp',
      episode: 5,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Романтика', 'Спорт', 'Сёнен', 'Школа'],
    },
    {
      id: 'magical-explorer',
      title: 'Магический исследователь',
      poster: '/anime/poster-magical-explorer.webp',
      episode: 7,
      year: 2026,
      season: 'Осень',
      type: 'ТВ',
      age: '16+',
      genres: ['Этти', 'Комедия', 'Приключения', 'Гарем'],
    },
  ],
}

export type Video = {
  id: string
  title: string
  thumb: string
  duration: string
  author: string
  views: string
}

export const videos: Video[] = [
  {
    id: 'cyberpunk-video',
    title: 'Киберпанк: Бегущие по краю 2 — Эпизод 10',
    thumb: '/anime/ep-cyberpunk.webp',
    duration: '30:13',
    author: 'AniDale',
    views: '12,4 тыс.',
  },
  {
    id: 'tokyo-video',
    title: 'Токийские мстители: Арка Трёх Небожителей — Эпизод 6',
    thumb: '/anime/ep-tokyo-revengers.webp',
    duration: '25:25',
    author: 'AniDale',
    views: '8,7 тыс.',
  },
  {
    id: 'aohako-video',
    title: 'Голубая шкатулка 2 — Эпизод 5',
    thumb: '/anime/ep-ao-no-hako.webp',
    duration: '24:01',
    author: 'AniDale',
    views: '5,2 тыс.',
  },
]

export type Franchise = {
  id: string
  title: string
  original: string
  poster: string
  years: string
  releases: number
  episodes: number
  duration: string
}

export const franchises: Franchise[] = [
  {
    id: 'kuroshitsuji',
    title: 'Тёмный дворецкий',
    original: 'Kuroshitsuji',
    poster: '/anime/franchise-kuroshitsuji.webp',
    years: '2008 — 2025',
    releases: 4,
    episodes: 60,
    duration: '1 день 8 минут',
  },
  {
    id: 'tokyo-revengers-franchise',
    title: 'Токийские мстители',
    original: 'Tokyo Revengers',
    poster: '/anime/franchise-tokyo-revengers.webp',
    years: '2021 — 2026',
    releases: 4,
    episodes: 56,
    duration: '22 часа 15 минут',
  },
  {
    id: 'trigun',
    title: 'Триган',
    original: 'Trigun',
    poster: '/anime/franchise-trigun.webp',
    years: '1998 — 2026',
    releases: 3,
    episodes: 50,
    duration: '20 часов 14 минут',
  },
]

export type Genre = {
  name: string
  count: number
}

export const genres: Genre[] = [
  { name: 'Экшен', count: 693 },
  { name: 'Комедия', count: 678 },
  { name: 'Фэнтези', count: 618 },
  { name: 'Романтика', count: 475 },
  { name: 'Приключения', count: 455 },
  { name: 'Школа', count: 378 },
  { name: 'Драма', count: 366 },
  { name: 'Сёнен', count: 325 },
  { name: 'Сверхъестественное', count: 304 },
  { name: 'Фантастика', count: 272 },
  { name: 'Повседневность', count: 219 },
  { name: 'Исекай', count: 46 },
]

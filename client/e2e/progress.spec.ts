import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

/**
 * Прогресс просмотра и «Продолжить просмотр» проверяются на подменённых ответах:
 * тест не зависит от базы и работает в CI, где нет пользователей и просмотров.
 */
const release = {
  __typename: 'AnimeRelease',
  id: 1,
  title: 'Тестовый релиз',
  originalTitle: '',
  description: 'Описание тестового релиза',
  year: 2026,
  season: 'Осень',
  type: 'ONA',
  ageRating: '16+',
  status: 'ongoing',
  poster: '',
  preview: '',
  franchise: '',
  isPublished: true,
  episodesCount: 2,
  genres: [{ __typename: 'AnimeGenre', id: 1, name: 'Экшен' }],
  latestEpisode: null,
  nextEpisode: null,
}

const episodes = [
  {
    __typename: 'AnimeEpisode',
    id: 2,
    releaseId: 1,
    number: 2,
    title: 'Эпизод 2',
    description: '',
    video: 'anime/videos/test.mp4',
    preview: '',
    duration: '24 мин',
    publishedAt: 1763000000000,
  },
  {
    __typename: 'AnimeEpisode',
    id: 1,
    releaseId: 1,
    number: 1,
    title: 'Эпизод 1',
    description: '',
    video: 'anime/videos/test.mp4',
    preview: '',
    duration: '24 мин',
    publishedAt: 1762000000000,
  },
]

const releasePayload = {
  data: { animeRelease: { ...release, episodes } },
}

const refreshPayload = {
  data: {
    refresh: {
      __typename: 'User',
      id: 1,
      login: 'tester',
      avatar: '',
      email: 'tester@example.com',
      isActivated: true,
      isAdmin: false,
    },
  },
}

const progressPayload = {
  data: {
    animeWatchProgress: {
      __typename: 'AnimeWatchProgress',
      position: 125,
      duration: 1400,
      completed: false,
      updatedAt: 1763000000000,
      release,
      episode: episodes[0],
    },
  },
}

/** Мок GraphQL по точному имени операции: SAVE_ANIME_WATCH_PROGRESS не перехватывает ANIME_WATCH_PROGRESS. */
const mockGraphql = async (route: Route) => {
  const body = route.request().postData() ?? ''
  const payload = body.includes('"operationName":"REFRESH"')
    ? refreshPayload
    : body.includes('"operationName":"ANIME_WATCH_PROGRESS"')
      ? progressPayload
      : body.includes('"operationName":"ANIME_RELEASE"')
        ? releasePayload
        : null
  if (!payload) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
}

test('просмотр продолжается с сохранённого места', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/graphql', mockGraphql)

  await page.goto('/watch/1')

  // Без ?episode открывается сохранённая серия, а плеер начинает с 2:05
  await expect(page.getByText('Продолжаем с 2:05')).toBeVisible()
  await expect(page.getByText('Тестовый релиз — Эпизод 2')).toBeVisible()

  // У другой серии сохранённого места нет — подсказка исчезает
  await page.getByRole('button', { name: '← Предыдущая' }).click()
  await expect(page).toHaveURL(/episode=1/)
  await expect(page.getByText('Продолжаем с 2:05')).toHaveCount(0)
  await expect(page.getByText('Тестовый релиз — Эпизод 1')).toBeVisible()

  expect(errors).toEqual([])
})

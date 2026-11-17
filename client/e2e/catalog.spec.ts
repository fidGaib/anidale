import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

/** Каталог: блок «Продолжить просмотр» показывается только вошедшему пользователю. */
const release = {
  __typename: 'AnimeRelease',
  id: 1,
  title: 'Тестовый релиз',
  originalTitle: '',
  description: '',
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

const emptyHome = {
  data: {
    animeHome: {
      __typename: 'AnimeHome',
      newEpisodes: [],
      videos: [],
      schedule: [],
      genres: [],
      franchises: [],
    },
  },
}

const emptyRefresh = { data: { refresh: null } }

const loggedRefresh = {
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

const continueWatching = {
  data: {
    animeContinueWatching: [
      {
        __typename: 'AnimeWatchProgress',
        position: 300,
        duration: 1400,
        completed: false,
        updatedAt: 1763000000000,
        release,
        episode: {
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
      },
    ],
  },
}

const mockGraphql = (refresh: unknown) => async (route: Route) => {
  const body = route.request().postData() ?? ''
  const payload = body.includes('"operationName":"REFRESH"')
    ? refresh
    : body.includes('"operationName":"ANIME_HOME"')
      ? emptyHome
      : body.includes('"operationName":"ANIME_CONTINUE_WATCHING"')
        ? continueWatching
        : null
  if (!payload) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
}

test('вошедший пользователь видит «Продолжить просмотр» с местом остановки', async ({ page }) => {
  await page.route('**/graphql', mockGraphql(loggedRefresh))
  await page.goto('/anime')

  await expect(page.getByRole('heading', { name: 'Продолжить просмотр' })).toBeVisible()
  const card = page.locator('a[href="/watch/1?episode=2"]').first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('Тестовый релиз')
  await expect(card).toContainText('5:00 из 23:20')
})

test('гостю блок «Продолжить просмотр» не показывается', async ({ page }) => {
  await page.route('**/graphql', mockGraphql(emptyRefresh))
  await page.goto('/anime')

  await expect(page.getByRole('heading', { name: 'Новые эпизоды' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Продолжить просмотр' })).toHaveCount(0)
})

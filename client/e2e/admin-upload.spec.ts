import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

/** Админка проверяется на подменённом GraphQL: нужен только интерфейс загрузки серий. */
const release = {
  __typename: 'AnimeRelease',
  id: 16,
  title: 'Токийские мстители',
  originalTitle: '',
  description: '',
  year: 2021,
  season: 'Весна',
  type: 'ТВ',
  ageRating: '16+',
  status: 'completed',
  poster: '',
  preview: '',
  franchise: '',
  isPublished: true,
  episodesCount: 24,
  genres: [],
  latestEpisode: null,
  nextEpisode: null,
}

const adminRefresh = {
  data: {
    refresh: {
      __typename: 'User',
      id: 2,
      login: 'Admin',
      avatar: '',
      email: 'admin@example.com',
      isActivated: true,
      isAdmin: true,
    },
  },
}

const mockGraphql = async (route: Route) => {
  const body = route.request().postData() ?? ''
  let payload: unknown = null
  if (body.includes('"operationName":"REFRESH"')) {
    payload = adminRefresh
  } else if (body.includes('"operationName":"ADMIN_ANIME_RELEASES"')) {
    payload = { data: { adminAnimeReleases: [release] } }
  } else if (body.includes('"operationName":"ADMIN_ANIME_SCHEDULE"')) {
    payload = { data: { adminAnimeSchedule: [] } }
  } else if (body.includes('"operationName":"ADMIN_ANIME_GENRES"')) {
    payload = { data: { adminAnimeGenres: [] } }
  } else if (body.includes('"operationName":"ADMIN_ANIME_EPISODES"')) {
    payload = { data: { adminAnimeEpisodes: [] } }
  } else if (body.includes('"operationName":"SAVE_ANIME_RELEASE"')) {
    payload = { data: { saveAnimeRelease: { ...release, id: 99, title: 'Новый релиз' } } }
  }
  if (!payload) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
}

test('в админке видно, где загружать видео серий', async ({ page }) => {
  await page.route('**/graphql', mockGraphql)
  await page.goto('/admin/anime')

  await expect(page.getByRole('heading', { name: 'Управление каталогом' })).toBeVisible()
  await expect(page.getByText('Видео серий загружается в «Серии и видео»')).toBeVisible()

  // Кнопка у релиза сразу открывает загрузку видео, а не список серий
  await page.getByRole('button', { name: 'Загрузить видео' }).click()
  await expect(page.getByText('Загрузка серий: Токийские мстители')).toBeVisible()
  await expect(page.getByLabel('Номер первой серии')).toHaveValue('1')

  // Можно выбрать несколько файлов за раз
  const input = page.locator('input[type="file"]')
  await expect(input).toHaveAttribute('multiple', '')
})

test('после создания релиза сразу открывается загрузка серий', async ({ page }) => {
  await page.route('**/graphql', mockGraphql)
  await page.goto('/admin/anime')

  await page.getByRole('button', { name: 'Добавить релиз' }).click()
  await page.getByLabel('Название', { exact: true }).fill('Новый релиз')
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'poster.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await page.getByRole('button', { name: 'Сохранить' }).click()

  await expect(page.getByText('Загрузка серий: Новый релиз')).toBeVisible()
  await expect(page.getByText('Выберите сразу несколько видео')).toBeVisible()
})

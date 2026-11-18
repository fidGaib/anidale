import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

/** Каталог проверяется на подменённом GraphQL: тест не зависит от наполнения базы. */
const release = (id: number, title: string, genre: string) => ({
  __typename: 'AnimeRelease',
  id,
  title,
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
  genres: [{ __typename: 'AnimeGenre', id: id, name: genre }],
  latestEpisode: {
    __typename: 'AnimeEpisode',
    id: id * 100,
    number: 2,
    title: '',
    duration: '24 мин',
  },
  nextEpisode: null,
})

const releases = [release(1, 'Киберпанк: Бегущие по краю 2', 'Киберпанк'), release(2, 'Герб демонов', 'Экшен')]

const filtersPayload = {
  data: {
    animeFilters: {
      __typename: 'AnimeFilters',
      years: [2026],
      types: ['ТВ', 'ONA', 'OVA', 'Фильм'],
      genres: [
        { __typename: 'AnimeGenre', id: 1, name: 'Киберпанк', releasesCount: 1 },
        { __typename: 'AnimeGenre', id: 2, name: 'Экшен', releasesCount: 1 },
      ],
    },
  },
}

const mockGraphql = async (route: Route) => {
  const body = route.request().postData() ?? ''
  if (body.includes('"operationName":"REFRESH"')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { refresh: null } }) })
    return
  }
  if (body.includes('"operationName":"ANIME_FILTERS"')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(filtersPayload) })
    return
  }
  if (body.includes('"operationName":"ANIME_CATALOG"')) {
    const variables = JSON.parse(body).variables ?? {}
    const search: string = variables.filter?.search ?? ''
    const items = releases.filter((item) => !search || item.title.toLowerCase().includes(search.toLowerCase()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { animeCatalog: { __typename: 'AnimeReleasePage', total: items.length, items } },
      }),
    })
    return
  }
  await route.continue()
}

test('каталог показывает релизы и ищет по названию', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/graphql', mockGraphql)

  await page.goto('/anime/catalog')

  await expect(page.getByRole('heading', { name: 'Все аниме' })).toBeVisible()
  await expect(page.getByText('Найдено: 2 релиза')).toBeVisible()
  await expect(page.locator('a[href="/watch/1"]')).toContainText('Киберпанк: Бегущие по краю 2')
  await expect(page.locator('a[href="/watch/2"]')).toContainText('Герб демонов')

  // Поиск с паузой: после ввода остаётся только подходящий релиз
  await page.getByLabel('Поиск по названию').fill('кибер')
  await expect(page.getByText('Найдено: 1 релиз')).toBeVisible()
  await expect(page.locator('a[href="/watch/1"]')).toBeVisible()
  await expect(page.locator('a[href="/watch/2"]')).toHaveCount(0)

  // Фильтры заполняются с сервера
  await expect(page.getByLabel('Жанр').locator('option', { hasText: 'Киберпанк' })).toHaveCount(1)
  await expect(page.getByLabel('Год').locator('option', { hasText: '2026' })).toHaveCount(1)

  expect(errors).toEqual([])
})

import { expect, test } from '@playwright/test'
import type { Route } from '@playwright/test'

/** Страница релиза проверяется на подменённом GraphQL: тест не зависит от наполнения базы. */
const episode = (id: number, number: number) => ({
  __typename: 'AnimeEpisode',
  id,
  releaseId: 16,
  number,
  title: number === 1 ? 'Начало' : 'Продолжение',
  description: '',
  video: `anime/videos/${id}.mp4`,
  preview: '',
  duration: '24:00',
  publishedAt: 1763000000000 + number,
})

const release = {
  __typename: 'AnimeRelease',
  id: 16,
  title: 'Токийские мстители',
  originalTitle: 'Tokyo Revengers',
  description: 'Такэмити попадает в прошлое и пытается изменить судьбу друзей.',
  year: 2021,
  season: 'Весна',
  type: 'ТВ',
  ageRating: '16+',
  status: 'completed',
  poster: 'anime/posters/16',
  preview: '',
  franchise: 'Токийские мстители',
  isPublished: true,
  episodesCount: 2,
  genres: [{ __typename: 'AnimeGenre', id: 1, name: 'Экшен' }],
  latestEpisode: episode(1602, 2),
  nextEpisode: null,
  // Сервер отдаёт серии от новых к старым — страница должна показать их по порядку
  episodes: [episode(1602, 2), episode(1601, 1)],
}

const related = {
  __typename: 'AnimeRelease',
  id: 17,
  title: 'Токийские мстители: Рождественская битва',
  originalTitle: '',
  description: '',
  year: 2021,
  season: 'Осень',
  type: 'ТВ',
  ageRating: '16+',
  status: 'completed',
  poster: '',
  preview: '',
  franchise: 'Токийские мстители',
  isPublished: true,
  episodesCount: 1,
  genres: [],
  latestEpisode: null,
  nextEpisode: null,
}

const mockGraphql = async (route: Route) => {
  const body = route.request().postData() ?? ''
  let payload: unknown = null
  if (body.includes('"operationName":"REFRESH"')) {
    payload = { data: { refresh: null } }
  } else if (body.includes('"operationName":"ANIME_RELEASE"')) {
    payload = { data: { animeRelease: release } }
  } else if (body.includes('"operationName":"ANIME_CATALOG"')) {
    payload = {
      data: {
        animeCatalog: { __typename: 'AnimeReleasePage', total: 1, items: [related] },
      },
    }
  }
  if (!payload) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
}

test('страница релиза показывает описание, серии и ведёт в плеер', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/graphql', mockGraphql)

  await page.goto('/anime/16')

  await expect(page.getByRole('heading', { name: 'Токийские мстители' })).toBeVisible()
  await expect(page.getByText('Tokyo Revengers')).toBeVisible()
  await expect(page.getByText('Такэмити попадает в прошлое')).toBeVisible()
  await expect(page.getByRole('link', { name: /Смотреть/ }).first()).toHaveAttribute(
    'href',
    '/watch/16?episode=1601',
  )

  // Серии идут по возрастанию, даже если сервер отдал их наоборот
  const episodeList = page.locator('section', {
    has: page.getByRole('heading', { name: 'Серии', exact: true }),
  })
  const episodes = episodeList.locator('a[href^="/watch/16?episode="]')
  await expect(episodes).toHaveCount(2)
  await expect(episodes.first()).toContainText('Начало')
  await expect(episodes.last()).toContainText('Продолжение')

  // Другие части франшизы открывают свои страницы релизов
  await expect(page.getByRole('heading', { name: /Ещё из франшизы/ })).toBeVisible()
  await expect(page.locator('a[href="/anime/17"]')).toContainText('Рождественская битва')

  await episodes.first().click()
  await expect(page).toHaveURL(/\/watch\/16\?episode=1601$/)

  expect(errors).toEqual([])
})

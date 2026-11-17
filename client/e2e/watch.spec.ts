import { expect, test } from '@playwright/test'

/**
 * Страница просмотра проверяется на подменённом ответе GraphQL: тест не зависит
 * от содержимого базы и работает в CI, где каталог пустой.
 *
 * __typename обязателен: без него Apollo не может записать ответ в кеш и страница падает.
 */
const releasePayload = {
  data: {
    animeRelease: {
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
      nextEpisode: null,
      episodes: [
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
      ],
    },
  },
}

test('страница просмотра показывает плеер и переключает серии', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  // Тело запроса читаем строкой: подходит и для JSON, и для multipart от apollo-upload-client
  await page.route('**/graphql', async (route) => {
    if ((route.request().postData() ?? '').includes('ANIME_RELEASE')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/watch/1')

  // По умолчанию открывается последняя серия: номер 2
  await expect(page.getByText('Тестовый релиз — Эпизод 2')).toBeVisible()
  await expect(page.locator('video')).toHaveAttribute('src', /\/storage\/anime\/videos\/test\.mp4/)

  // «Следующей» нет, «предыдущая» ведёт на эпизод 1
  await expect(page.getByRole('button', { name: 'Следующая →' })).toBeDisabled()
  await page.getByRole('button', { name: '← Предыдущая' }).click()
  await expect(page).toHaveURL(/episode=1/)
  await expect(page.getByText('Тестовый релиз — Эпизод 1')).toBeVisible()

  expect(errors).toEqual([])
})

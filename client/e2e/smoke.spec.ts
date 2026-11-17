import { expect, test } from '@playwright/test'

/**
 * Смоук-тесты: приложение действительно рендерится в браузере и не падает
 * с ошибкой JS. Глубокие сценарии (вход, сообщения, музыка) — следующий шаг.
 */
test('каталог аниме открывается без ошибок рендера', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/anime')

  await expect(page.getByText('Новые эпизоды').first()).toBeVisible()
  await expect(page.getByText('Расписание').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('страница входа показывает форму', async ({ page }) => {
  await page.goto('/signin')

  await expect(page).toHaveTitle(/Вход/)
  await expect(page.getByPlaceholder('E-mail...')).toBeVisible()
  await expect(page.getByPlaceholder('Пароль...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
})

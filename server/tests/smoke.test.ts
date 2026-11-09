import { beforeEach, describe, expect, it } from 'vitest'

import { createUser, prisma, resetDb } from './helpers'
import { assertTestDatabase } from './test-db'

describe('тестовое окружение', () => {
  beforeEach(resetDb)

  it('работает только с тестовой базой', () => {
    expect(() => assertTestDatabase()).not.toThrow()
    expect(process.env.DB_LINK).toContain('_test')
  })

  it('создаёт пользователей и очищает базу между тестами', async () => {
    await createUser('a')
    expect(await prisma.user.count()).toBe(1)
    await resetDb()
    expect(await prisma.user.count()).toBe(0)
  })
})

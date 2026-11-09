import { beforeEach, describe, expect, it } from 'vitest'

import UserService from '@/api/user/service'

import { createUser, resetDb } from './helpers'

beforeEach(resetDb)

describe('подробная информация профиля', () => {
  it('сохраняет место работы, образование, «о себе» и сайт, лишние пробелы убирает', async () => {
    const me = await createUser('me')
    const updated = await UserService.updateUser(me.id, {
      work: '  Яндекс, разработчик ',
      education: ' МГУ ',
      about: ' Люблю аниме ',
      website: ' https://example.com ',
    })
    expect(updated).toMatchObject({
      work: 'Яндекс, разработчик',
      education: 'МГУ',
      about: 'Люблю аниме',
      website: 'https://example.com',
    })
    const shown = await UserService.find(me.id)
    expect(shown).toMatchObject({ work: 'Яндекс, разработчик', about: 'Люблю аниме' })
  })

  it('поле можно очистить пустой строкой, остальные не трогаются', async () => {
    const me = await createUser('me')
    await UserService.updateUser(me.id, { work: 'Завод', education: 'Колледж' })
    const updated = await UserService.updateUser(me.id, { work: '' })
    expect(updated.work).toBe('')
    expect(updated.education).toBe('Колледж')
  })

  it('слишком длинные значения обрезаются до лимита', async () => {
    const me = await createUser('me')
    const updated = await UserService.updateUser(me.id, {
      work: 'а'.repeat(500),
      about: 'б'.repeat(5000),
      website: 'в'.repeat(1000),
    })
    expect(updated.work).toHaveLength(100)
    expect(updated.about).toHaveLength(500)
    expect(updated.website).toHaveLength(200)
  })

  it('сайт принимает только http(s)-ссылки, иначе отклоняется', async () => {
    const me = await createUser('me')
    await expect(UserService.updateUser(me.id, { website: 'javascript:alert(1)' })).rejects.toThrow('Сайт')
    const ok = await UserService.updateUser(me.id, { website: 'www.example.com' })
    expect(ok.website).toBe('https://www.example.com')
  })
})

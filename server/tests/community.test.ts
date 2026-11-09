import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityService, { cleanName, cleanWebsite } from '@/api/community/service'
import PostService from '@/api/post/service'

import { createPost, createUsers, prisma, resetDb } from './helpers'

// Нативную обработку картинок заменяем заглушкой
const storage = vi.hoisted(() => ({ saved: [] as string[], removed: [] as string[] }))
vi.mock('@/api/post/file-service', () => {
  let n = 0
  class FileStorageService {
    async saveImage() {
      n += 1
      const medium = `communities/aa/img${n}`
      storage.saved.push(medium)
      return { high: '', medium, small: `${medium}-s`, vertical: false, type: 'webp' }
    }
    async removeFiles(images: unknown) {
      const list = Array.isArray(images) ? images : [images]
      for (const image of list)
        storage.removed.push(typeof image === 'string' ? image : (image as { medium: string }).medium)
      return true
    }
  }
  return { default: FileStorageService }
})

type User = Awaited<ReturnType<typeof createUsers>>[number]

const file = () => new File(['x'], 'a.jpg', { type: 'image/jpeg' })
let owner: User
let anna: User
let boris: User

beforeEach(async () => {
  await resetDb()
  storage.saved.length = 0
  storage.removed.length = 0
  ;[owner, anna, boris] = await createUsers(3)
})

const make = (name = 'Аниме клуб', userId = owner.id) => CommunityService.create(userId, { name, description: 'о нас' })

describe('сообщества: проверка полей', () => {
  it('название обязательно и ограничено', () => {
    expect(cleanName('  Аниме   клуб ')).toBe('Аниме клуб')
    expect(() => cleanName('  ')).toThrow('Введите название')
    expect(() => cleanName('а'.repeat(61))).toThrow('длиннее')
  })
  it('сайт только http(s)', () => {
    expect(cleanWebsite('example.com')).toBe('https://example.com')
    expect(cleanWebsite('')).toBe('')
    expect(() => cleanWebsite('javascript:alert(1)')).toThrow('Сайт')
  })
})

describe('сообщества: создание и вступление', () => {
  it('создатель становится участником и администратором', async () => {
    const community = await make()
    expect(community).toMatchObject({
      name: 'Аниме клуб',
      membersCount: 1,
      isMember: true,
      isAdmin: true,
      isOwner: true,
    })
  })

  it('картинка сохраняется как аватар', async () => {
    const community = await CommunityService.create(owner.id, { name: 'С аватаром', avatar: file() })
    expect(community.avatar).toBe(storage.saved[0])
  })

  it('вступление и выход меняют счётчик, повторное вступление безопасно', async () => {
    const { id } = await make()
    expect(await CommunityService.join(anna.id, id)).toMatchObject({ membersCount: 2, isMember: true, isAdmin: false })
    expect(await CommunityService.join(anna.id, id)).toMatchObject({ membersCount: 2 })
    expect(await CommunityService.leave(anna.id, id)).toMatchObject({ membersCount: 1, isMember: false })
    // Выход не участника ничего не ломает
    expect(await CommunityService.leave(boris.id, id)).toMatchObject({ membersCount: 1 })
  })

  it('создатель выйти не может, несуществующее сообщество отклоняется', async () => {
    const { id } = await make()
    await expect(CommunityService.leave(owner.id, id)).rejects.toThrow('Создатель')
    await expect(CommunityService.join(anna.id, 9999)).rejects.toThrow('не найдено')
  })
})

describe('сообщества: список и поиск', () => {
  it('«все» идут по числу участников, поиск по названию без учёта регистра', async () => {
    const a = await make('Музыка')
    const b = await make('Манга')
    await CommunityService.join(anna.id, b.id)
    await CommunityService.join(boris.id, b.id)
    const all = await CommunityService.list(anna.id, { limit: 10, offset: 0 })
    expect(all.map((c) => c.id)).toEqual([b.id, a.id])
    const found = await CommunityService.list(undefined, { search: 'МАН', limit: 10, offset: 0 })
    expect(found.map((c) => c.name)).toEqual(['Манга'])
  })

  it('«мои» и «управляю» зависят от просматривающего, гостю — пусто', async () => {
    const a = await make('Раз')
    const b = await make('Два', anna.id)
    await CommunityService.join(anna.id, a.id)
    expect(
      (await CommunityService.list(anna.id, { filter: 'mine', limit: 10, offset: 0 })).map((c) => c.id).sort(),
    ).toEqual([a.id, b.id].sort())
    expect(
      (await CommunityService.list(anna.id, { filter: 'managed', limit: 10, offset: 0 })).map((c) => c.id),
    ).toEqual([b.id])
    expect(await CommunityService.list(undefined, { filter: 'mine', limit: 10, offset: 0 })).toEqual([])
  })

  it('постраничная выдача и ограничение размера страницы', async () => {
    for (let i = 0; i < 5; i++) await make(`С${i}`)
    expect(await CommunityService.list(anna.id, { limit: 2, offset: 0 })).toHaveLength(2)
    expect(await CommunityService.list(anna.id, { limit: 2, offset: 4 })).toHaveLength(1)
    expect((await CommunityService.list(anna.id, { limit: 100000, offset: 0 })).length).toBe(5)
  })
})

describe('сообщества: участники и права', () => {
  it('администраторы идут первыми и помечен создатель', async () => {
    const { id } = await make()
    await CommunityService.join(anna.id, id)
    await CommunityService.join(boris.id, id)
    await CommunityService.setAdmin(owner.id, id, boris.id, true)
    const members = await CommunityService.members(id, 10, 0)
    expect(members.map((m) => m.user.id)).toEqual([owner.id, boris.id, anna.id])
    expect(members[0]).toMatchObject({ role: 'admin', isOwner: true })
    expect(members[1]).toMatchObject({ role: 'admin', isOwner: false })
  })

  it('назначать администраторов может только создатель, и только участников', async () => {
    const { id } = await make()
    await CommunityService.join(anna.id, id)
    await expect(CommunityService.setAdmin(anna.id, id, anna.id, true)).rejects.toThrow('Нет доступа')
    await expect(CommunityService.setAdmin(owner.id, id, boris.id, true)).rejects.toThrow('не состоит')
    await expect(CommunityService.setAdmin(owner.id, id, owner.id, false)).rejects.toThrow('создателя')
    await CommunityService.setAdmin(owner.id, id, anna.id, true)
    expect((await CommunityService.find(id, anna.id))?.isAdmin).toBe(true)
    await CommunityService.setAdmin(owner.id, id, anna.id, false)
    expect((await CommunityService.find(id, anna.id))?.isAdmin).toBe(false)
  })

  it('править может администратор, обычный участник — нет', async () => {
    const { id } = await make()
    await CommunityService.join(anna.id, id)
    await CommunityService.join(boris.id, id)
    await expect(CommunityService.update(anna.id, id, { name: 'Взлом' })).rejects.toThrow('Нет доступа')
    await CommunityService.setAdmin(owner.id, id, boris.id, true)
    const updated = await CommunityService.update(boris.id, id, {
      name: 'Новое',
      status: ' статус ',
      website: 'site.ru',
    })
    expect(updated).toMatchObject({ name: 'Новое', status: 'статус', website: 'https://site.ru' })
    await expect(CommunityService.update(boris.id, id, {})).rejects.toThrow('Не предоставлены')
  })

  it('замена аватара и обложки удаляет прежние файлы', async () => {
    const created = await CommunityService.create(owner.id, { name: 'Т', avatar: file() })
    const first = created.avatar
    await CommunityService.update(owner.id, created.id, { avatar: file(), cover: file() })
    expect(storage.removed).toEqual([first])
    const withCover = await CommunityService.find(created.id, owner.id)
    await CommunityService.update(owner.id, created.id, { removeCover: true })
    expect(storage.removed).toContain(withCover?.cover)
    expect((await CommunityService.find(created.id, owner.id))?.cover).toBe('')
  })
})

describe('сообщества: стена', () => {
  it('администратор публикует сразу, участник — только в предложку, посторонний не может', async () => {
    const { id } = await make()
    await CommunityService.join(anna.id, id)
    await expect(PostService.create(boris.id, 'привет', [], [], id)).rejects.toThrow('только участники')
    const suggested = await PostService.create(anna.id, 'предлагаю', [], [], id)
    expect(suggested.post.suggested).toBe(true)
    const post = await PostService.create(owner.id, 'новость', [], [], id)
    expect(post.post.suggested).toBe(false)
    expect(post.post.communityId).toBe(id)
    expect(post.post.community).toMatchObject({ id, name: 'Аниме клуб' })
  })

  it('записи сообщества не попадают на личную стену автора, но есть на стене сообщества', async () => {
    const { id } = await make()
    await PostService.create(owner.id, 'от сообщества', [], [], id)
    await createPost(owner.id, 'личная')
    const wall = await PostService.find(10, 0, owner.id, anna.id)
    expect(wall.map((p) => p.description)).toEqual(['личная'])
    const community = await PostService.findByCommunity(id, 10, 0, anna.id)
    expect(community.map((p) => p.description)).toEqual(['от сообщества'])
    expect(community[0].community).toMatchObject({ id })
  })

  it('закреплённая запись идёт первой, закрепление у сообщества своё', async () => {
    const { id } = await make()
    const first = await PostService.create(owner.id, 'первая', [], [], id)
    await PostService.create(owner.id, 'вторая', [], [], id)
    const personal = await createPost(owner.id, 'личная')
    await PostService.pin(owner.id, personal.id, true)
    await PostService.pin(owner.id, first.post.id, true)
    const list = await PostService.findByCommunity(id, 10, 0)
    expect(list.map((p) => p.description)).toEqual(['первая', 'вторая'])
    // Личная закреплённая запись осталась закреплённой
    expect((await prisma.post.findUnique({ where: { id: personal.id } }))?.pinned).toBe(true)
  })

  it('любой администратор удаляет запись сообщества, участник — нет', async () => {
    const { id } = await make()
    await CommunityService.join(anna.id, id)
    await CommunityService.join(boris.id, id)
    await CommunityService.setAdmin(owner.id, id, boris.id, true)
    const post = await PostService.create(owner.id, 'новость', [], [], id)
    await expect(PostService.remove(post.post.id, anna.id)).rejects.toThrow('Нет доступа')
    expect(await PostService.remove(post.post.id, boris.id)).toBe(true)
  })
})

describe('сообщества: удаление', () => {
  it('удаляет сообщество, участников, записи и картинки; только создатель', async () => {
    const created = await CommunityService.create(owner.id, { name: 'Т', avatar: file() })
    await CommunityService.join(anna.id, created.id)
    await PostService.create(owner.id, 'запись', [], [], created.id)
    await expect(CommunityService.remove(anna.id, created.id)).rejects.toThrow('Нет доступа')
    expect(await CommunityService.remove(owner.id, created.id)).toBe(true)
    expect(await prisma.community.count()).toBe(0)
    expect(await prisma.communityMember.count()).toBe(0)
    expect(await prisma.post.count()).toBe(0)
    expect(storage.removed).toContain(created.avatar)
  })
})

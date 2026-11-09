import { beforeEach, describe, expect, it, vi } from 'vitest'

import ArticleController from '@/api/article/controller'
import CommunityService, { cleanLinks } from '@/api/community/service'
import PhotoService from '@/api/photo/service'
import PostController from '@/api/post/controller'
import PostService from '@/api/post/service'
import SearchController from '@/api/search/controller'
import VideoService from '@/api/video/service'

import { createPost, createUsers, createVideo, eventsOf, prisma, resetDb } from './helpers'

// Нативную обработку картинок заменяем заглушкой
vi.mock('@/api/post/file-service', () => {
  let n = 0
  class FileStorageService {
    async saveImage() {
      n += 1
      const medium = `communities/aa/img${n}`
      return { high: '', medium, small: `${medium}-s`, vertical: false, type: 'webp' }
    }
    async removeFiles() {
      return true
    }
  }
  return { default: FileStorageService }
})

type User = Awaited<ReturnType<typeof createUsers>>[number]
const blocks = JSON.stringify([{ type: 'p', text: 'Текст статьи' }])

let owner: User
let anna: User
let boris: User

beforeEach(async () => {
  await resetDb()
  ;[owner, anna, boris] = await createUsers(3)
})

const closed = (name = 'Закрытый клуб') => CommunityService.create(owner.id, { name, isClosed: true })
const open = (name = 'Открытый клуб') => CommunityService.create(owner.id, { name })

const notifications = (userId: number) => prisma.notification.findMany({ where: { userId }, orderBy: { id: 'asc' } })

describe('закрытые сообщества и заявки', () => {
  it('в закрытое сообщество вступают по заявке: одна заявка, уведомление администратору', async () => {
    const { id } = await closed()
    const result = await CommunityService.join(anna.id, id)
    expect(result).toMatchObject({ isMember: false, hasRequested: true, membersCount: 1, canView: false })
    await CommunityService.join(anna.id, id)
    expect(await prisma.communityRequest.count()).toBe(1)
    const note = await notifications(owner.id)
    expect(note).toHaveLength(1)
    expect(note[0]).toMatchObject({ type: 'community_request', communityId: id, actorId: anna.id })
  })

  it('принятая заявка делает участником и уведомляет, отклонённая — нет', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    await CommunityService.join(boris.id, id)
    expect((await CommunityService.requests(owner.id, id, 10, 0)).map((r) => r.user.id)).toEqual([anna.id, boris.id])
    await CommunityService.resolveRequest(owner.id, id, anna.id, true)
    await CommunityService.resolveRequest(owner.id, id, boris.id, false)
    expect(await CommunityService.find(id, anna.id)).toMatchObject({
      isMember: true,
      hasRequested: false,
      canView: true,
    })
    expect(await CommunityService.find(id, boris.id)).toMatchObject({ isMember: false, hasRequested: false })
    expect((await notifications(anna.id)).map((n) => n.type)).toEqual(['community_accept'])
    expect(await notifications(boris.id)).toEqual([])
    await expect(CommunityService.resolveRequest(owner.id, id, boris.id, true)).rejects.toThrow('Заявка не найдена')
  })

  it('заявки смотрит и решает только администратор; свою заявку можно отозвать', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    await expect(CommunityService.requests(anna.id, id, 10, 0)).rejects.toThrow('Нет доступа')
    await expect(CommunityService.resolveRequest(anna.id, id, anna.id, true)).rejects.toThrow('Нет доступа')
    await CommunityService.leave(anna.id, id)
    expect(await prisma.communityRequest.count()).toBe(0)
  })

  it('счётчик заявок виден только администратору', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    expect((await CommunityService.find(id, owner.id))?.requestsCount).toBe(1)
    expect((await CommunityService.find(id, anna.id))?.requestsCount).toBe(0)
  })

  it('стена, участники, видео и фото закрытого сообщества скрыты от посторонних', async () => {
    const { id } = await closed()
    await PostService.create(owner.id, 'секрет', [], [], id)
    await CommunityService.join(anna.id, id)
    await CommunityService.resolveRequest(owner.id, id, anna.id, true)
    expect(await CommunityService.posts(id, 10, 0, anna.id)).toHaveLength(1)
    expect(await CommunityService.posts(id, 10, 0, boris.id)).toEqual([])
    expect(await CommunityService.posts(id, 10, 0, undefined)).toEqual([])
    expect(await CommunityService.members(id, 10, 0, boris.id)).toEqual([])
    expect(await CommunityService.members(id, 10, 0, anna.id)).toHaveLength(2)
    expect(await VideoService.listCommunity(id, 10, 0, boris.id)).toEqual([])
    expect(await PhotoService.listCommunity(id, 10, 0, boris.id)).toEqual([])
  })

  it('записи закрытого сообщества не попадают в общую ленту, а открытого — попадают', async () => {
    const secret = await closed()
    const pub = await open()
    await PostService.create(owner.id, 'тайная', [], [], secret.id)
    await PostService.create(owner.id, 'публичная', [], [], pub.id)
    const feed = await PostService.find(10, 0, undefined, boris.id)
    expect(feed.map((p) => p.description)).toEqual(['публичная'])
    const found = await SearchController.search('ая', 'posts', 10, 0, boris.id)
    expect(found.posts.map((p) => p.description)).toEqual(['публичная'])
    expect(found.postsTotal).toBe(1)
  })

  it('пост закрытого сообщества нельзя открыть по ссылке постороннему', async () => {
    const { id } = await closed()
    const post = await PostService.create(owner.id, 'секрет', [], [], id)
    expect(await PostService.findOne(post.post.id, boris.id)).toBeNull()
    expect(await PostService.findOne(post.post.id, owner.id)).not.toBeNull()
  })

  it('когда сообщество становится открытым, ожидающие заявки принимаются', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    await CommunityService.update(owner.id, id, { isClosed: false })
    expect(await CommunityService.find(id, anna.id)).toMatchObject({ isMember: true, hasRequested: false })
  })
})

describe('предложка', () => {
  it('предложенная запись скрыта, администратор получает уведомление и видит её в очереди', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    const created = await PostController.create(anna.id, 'моя запись', [], [], id)
    expect(created.post.suggested).toBe(true)
    // На сокет предложка не уходит
    expect(eventsOf('newPost')).toHaveLength(0)
    expect((await notifications(owner.id)).map((n) => n.type)).toEqual(['community_suggest'])
    expect(await CommunityService.posts(id, 10, 0, boris.id)).toEqual([])
    expect(await PostService.find(10, 0, undefined, boris.id)).toEqual([])
    const queue = await CommunityService.suggested(owner.id, id, 10, 0)
    expect(queue.map((p) => p.description)).toEqual(['моя запись'])
    expect((await CommunityService.find(id, owner.id))?.suggestedCount).toBe(1)
    await expect(CommunityService.suggested(anna.id, id, 10, 0)).rejects.toThrow('Нет доступа')
  })

  it('автор и администратор открывают предложенную запись, посторонний — нет', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    const post = await PostService.create(anna.id, 'моя', [], [], id)
    expect(await PostService.findOne(post.post.id, anna.id)).not.toBeNull()
    expect(await PostService.findOne(post.post.id, owner.id)).not.toBeNull()
    expect(await PostService.findOne(post.post.id, boris.id)).toBeNull()
  })

  it('одобрение выкладывает запись на стену и уведомляет автора', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    const post = await PostService.create(anna.id, 'моя', [], [], id)
    await CommunityService.review(owner.id, post.post.id, true)
    expect((await CommunityService.posts(id, 10, 0, boris.id)).map((p) => p.description)).toEqual(['моя'])
    expect((await notifications(anna.id)).map((n) => n.type)).toEqual(['community_accept'])
    await expect(CommunityService.review(owner.id, post.post.id, true)).rejects.toThrow('не найдена')
  })

  it('отклонение удаляет запись; решать может только администратор', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    const post = await PostService.create(anna.id, 'моя', [], [], id)
    await expect(CommunityService.review(anna.id, post.post.id, true)).rejects.toThrow('Нет доступа')
    await CommunityService.review(owner.id, post.post.id, false)
    expect(await prisma.post.count()).toBe(0)
    expect(await notifications(anna.id)).toEqual([])
  })
})

describe('чёрный список и приглашения', () => {
  it('заблокированный исключается, не может вступить и предлагать записи', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    await CommunityService.ban(owner.id, id, anna.id, ' спам ')
    expect(await CommunityService.find(id, anna.id)).toMatchObject({ isMember: false, isBanned: true })
    await expect(CommunityService.join(anna.id, id)).rejects.toThrow('чёрном списке')
    await expect(PostService.create(anna.id, 'x', [], [], id)).rejects.toThrow('чёрном списке')
    expect((await CommunityService.bans(owner.id, id, 10, 0))[0]).toMatchObject({ reason: 'спам' })
    await CommunityService.unban(owner.id, id, anna.id)
    expect(await CommunityService.join(anna.id, id)).toMatchObject({ isMember: true })
  })

  it('блокировка снимает заявку; создателя блокировать нельзя; администратора — только создатель', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    await CommunityService.ban(owner.id, id, anna.id)
    expect(await prisma.communityRequest.count()).toBe(0)
    await expect(CommunityService.ban(owner.id, id, owner.id)).rejects.toThrow(/создателя/i)

    const other = await open('Другое')
    await CommunityService.join(anna.id, other.id)
    await CommunityService.join(boris.id, other.id)
    await CommunityService.setAdmin(owner.id, other.id, anna.id, true)
    await expect(CommunityService.ban(anna.id, other.id, owner.id)).rejects.toThrow(/создателя/i)
    await CommunityService.setAdmin(owner.id, other.id, boris.id, true)
    await expect(CommunityService.ban(anna.id, other.id, boris.id)).rejects.toThrow('только создатель')
    await expect(CommunityService.ban(boris.id, other.id, anna.id)).rejects.toThrow('только создатель')
    expect(await CommunityService.ban(owner.id, other.id, boris.id)).toBe(true)
  })

  it('чёрный список видит только администратор', async () => {
    const { id } = await open()
    await expect(CommunityService.bans(anna.id, id, 10, 0)).rejects.toThrow('Нет доступа')
    await expect(CommunityService.ban(anna.id, id, boris.id)).rejects.toThrow('Нет доступа')
  })

  it('приглашение уведомляет; зовут участники, в закрытое — только администраторы', async () => {
    const pub = await open()
    await CommunityService.join(anna.id, pub.id)
    await expect(CommunityService.invite(boris.id, pub.id, anna.id)).rejects.toThrow('только участники')
    expect(await CommunityService.invite(anna.id, pub.id, boris.id)).toBe(true)
    expect(await notifications(boris.id)).toMatchObject([
      { type: 'community_invite', communityId: pub.id, actorId: anna.id },
    ])
    await expect(CommunityService.invite(anna.id, pub.id, anna.id)).rejects.toThrow('уже в сообществе')

    const secret = await closed()
    await CommunityService.join(anna.id, secret.id)
    await CommunityService.resolveRequest(owner.id, secret.id, anna.id, true)
    await expect(CommunityService.invite(anna.id, secret.id, boris.id)).rejects.toThrow('администраторы')
    expect(await CommunityService.invite(owner.id, secret.id, boris.id)).toBe(true)
  })
})

describe('ссылки и профиль', () => {
  it('ссылки: очистка, лимит, только http(s), только администратор', async () => {
    expect(
      cleanLinks([
        { title: '  ', url: 'example.com' },
        { title: 'Пусто', url: '  ' },
      ]),
    ).toEqual([{ title: 'https://example.com', url: 'https://example.com' }])
    expect(() => cleanLinks([{ title: 'x', url: 'javascript:alert(1)' }])).toThrow('Сайт')
    expect(() => cleanLinks(Array.from({ length: 11 }, () => ({ title: 'a', url: 'a.ru' })))).toThrow('не больше')

    const { id } = await open()
    await expect(CommunityService.setLinks(anna.id, id, [{ title: 'a', url: 'a.ru' }])).rejects.toThrow('Нет доступа')
    const updated = await CommunityService.setLinks(owner.id, id, [
      { title: 'Сайт', url: 'a.ru' },
      { title: 'Чат', url: 'https://t.me/x' },
    ])
    expect(updated.links.map((l) => l.title)).toEqual(['Сайт', 'Чат'])
    const replaced = await CommunityService.setLinks(owner.id, id, [{ title: 'Один', url: 'b.ru' }])
    expect(replaced.links).toHaveLength(1)
  })

  it('сообщества человека: закрытые видны только своим участникам', async () => {
    const pub = await open('Открытое')
    const secret = await closed('Закрытое')
    await CommunityService.join(anna.id, pub.id)
    await CommunityService.join(anna.id, secret.id)
    await CommunityService.resolveRequest(owner.id, secret.id, anna.id, true)
    const forOwnerOfProfile = await CommunityService.ofUser(anna.id, anna.id, 10)
    expect(forOwnerOfProfile.items.map((c) => c.name).sort()).toEqual(['Закрытое', 'Открытое'])
    const forStranger = await CommunityService.ofUser(anna.id, boris.id, 10)
    expect(forStranger.items.map((c) => c.name)).toEqual(['Открытое'])
    expect(forStranger.total).toBe(2)
  })

  it('общий поиск находит сообщества по названию', async () => {
    await open('Любители манги')
    await open('Кулинария')
    const found = await SearchController.search('манг', 'communities', 10, 0, boris.id)
    expect(found.communities.map((c) => c.name)).toEqual(['Любители манги'])
    expect(found.communitiesTotal).toBe(1)
    const all = await SearchController.search('манг', 'all', 5, 0, boris.id)
    expect(all.communitiesTotal).toBe(1)
  })
})

describe('статьи, видео и фото сообщества', () => {
  it('статью в сообщество публикует только администратор, она видна на его стене, а не на личной', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    await expect(ArticleController.create(anna.id, { communityId: id, title: 'Т', content: blocks })).rejects.toThrow(
      'только администраторы',
    )
    const post = await ArticleController.create(owner.id, { communityId: id, title: 'Новости', content: blocks })
    expect(post?.community?.id).toBe(id)
    expect((await CommunityService.posts(id, 10, 0, anna.id))[0].article).toMatchObject({ title: 'Новости' })
    expect(await PostService.find(10, 0, owner.id, anna.id)).toEqual([])
  })

  it('администратор сообщества правит его статью', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    await CommunityService.setAdmin(owner.id, id, anna.id, true)
    const post = await ArticleController.create(owner.id, { communityId: id, title: 'Старое', content: blocks })
    const edited = await ArticleController.edit(anna.id, post?.article?.id ?? 0, { title: 'Новое', content: blocks })
    expect(edited?.article?.title).toBe('Новое')
    await expect(
      ArticleController.edit(boris.id, post?.article?.id ?? 0, { title: 'Х', content: blocks }),
    ).rejects.toThrow('Нет доступа')
  })

  it('видео альбома сообщества: добавляют администраторы, оно не попадает в личные видео', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    await expect(VideoService.create(anna.id, new File(['x'], 'v.mp4'), 'т', id)).rejects.toThrow(
      'только администраторы',
    )

    const own = await createVideo(owner.id, null, 'личное')
    const album = await prisma.video.create({
      data: { ownerId: owner.id, communityId: id, title: 'альбом', file: 'videos/a.mp4', size: 1, type: 'video/mp4' },
    })
    const wallPost = await PostService.create(owner.id, 'запись', [], [], id)
    const inPost = await prisma.video.create({
      data: {
        ownerId: owner.id,
        postId: wallPost.post.id,
        title: 'в записи',
        file: 'videos/b.mp4',
        size: 1,
        type: 'video/mp4',
      },
    })

    expect((await VideoService.list(owner.id, 30, 0, anna.id)).map((v) => v.id)).toEqual([own.id])
    expect(await VideoService.count(owner.id, anna.id)).toBe(1)
    expect((await VideoService.listAll(30, 0)).map((v) => v.id)).toEqual([own.id])
    expect((await VideoService.listCommunity(id, 30, 0, anna.id)).map((v) => v.id).sort()).toEqual(
      [album.id, inPost.id].sort(),
    )
  })

  it('фото альбома сообщества не попадают в личные фото и считаются отдельно', async () => {
    const { id } = await open()
    await prisma.photo.create({ data: { userId: owner.id, communityId: id, medium: 'photos/c', small: 'photos/c-s' } })
    await prisma.photo.create({ data: { userId: owner.id, medium: 'photos/p', small: 'photos/p-s' } })
    await createPost(owner.id, 'личный')
    expect(await PhotoService.count(owner.id, anna.id)).toBe(1)
    expect((await PhotoService.list(owner.id, 30, 0, anna.id)).map((p) => p.medium)).toEqual(['photos/p'])
    expect((await PhotoService.listCommunity(id, 30, 0, anna.id)).map((p) => p.medium)).toEqual(['photos/c'])
  })

  it('чужой администратор удаляет фото сообщества, посторонний — нет', async () => {
    const { id } = await open()
    await CommunityService.join(anna.id, id)
    await CommunityService.join(boris.id, id)
    await CommunityService.setAdmin(owner.id, id, anna.id, true)
    const photo = await prisma.photo.create({
      data: { userId: owner.id, communityId: id, medium: 'photos/c', small: 's' },
    })
    await expect(PhotoService.remove(boris.id, photo.id)).rejects.toThrow('Нет доступа')
    expect(await PhotoService.remove(anna.id, photo.id)).toBe(true)
  })

  it('удаление сообщества убирает альбомы и уведомления', async () => {
    const { id } = await closed()
    await CommunityService.join(anna.id, id)
    await prisma.photo.create({ data: { userId: owner.id, communityId: id, medium: 'photos/c', small: 's' } })
    await prisma.video.create({
      data: { ownerId: owner.id, communityId: id, title: 'в', file: 'videos/a.mp4', size: 1, type: 'video/mp4' },
    })
    expect(await CommunityService.remove(owner.id, id)).toBe(true)
    expect(await prisma.photo.count()).toBe(0)
    expect(await prisma.video.count()).toBe(0)
    expect(await prisma.notification.count()).toBe(0)
  })
})

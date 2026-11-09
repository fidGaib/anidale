import { buildSchema, parse, validate } from 'graphql'
import http from 'http'
import { beforeEach, describe, expect, it } from 'vitest'

import CommunityService from '@/api/community/service'
import {
  canAccessFile,
  cleanRelative,
  clearAccessCache,
  decideFileAccess,
  stemOf,
  viewerFromCookies,
} from '@/api/storage/access'
import tokenService from '@/api/user/token-service'
import { storageAuth } from '@/handlers/storage-auth'
import { validationRules } from '@/schema/depth-limit'

import { createPost, createPostImage, createUsers, createVideo, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]
let owner: User
let friend: User
let stranger: User

beforeEach(async () => {
  await resetDb()
  clearAccessCache()
  ;[owner, friend, stranger] = await createUsers(3)
})

describe('пути', () => {
  it('stemOf убирает только расширение', () => {
    expect(stemOf('posts/ab/cd.webp')).toBe('posts/ab/cd')
    expect(stemOf('messages/files/abc')).toBe('messages/files/abc')
    expect(stemOf('music/x.y.mp3')).toBe('music/x.y')
  })

  it('cleanRelative отсекает выходы из каталога и мусор', () => {
    expect(cleanRelative('posts/ab/cd.webp')).toBe('posts/ab/cd.webp')
    expect(cleanRelative('posts/%D1%84.webp')).toBe('posts/ф.webp')
    for (const bad of [
      '',
      '../x',
      'posts/../../.env',
      '/etc/passwd',
      'a\\b',
      'a//b',
      'a/./b',
      '%2e%2e/x',
      'a\0b',
      '%E0%A4%A',
    ]) {
      expect(cleanRelative(bad)).toBeNull()
    }
  })
})

describe('кто какие файлы получает', () => {
  it('аватарки, обложки и картинки сообществ открыты всем, неизвестные каталоги и файлы без записей закрыты', async () => {
    for (const path of ['avatars/ab/cd.webp', 'covers/ab/cd.webp', 'communities/ab/cd.webp']) {
      expect(await decideFileAccess(path)).toBe(true)
    }
    expect(await decideFileAccess('posts/нет/такого.webp')).toBe(false)
    expect(await decideFileAccess('videos/нет.mp4')).toBe(false)
    expect(await decideFileAccess('secret/file.txt')).toBe(false)
    expect(await decideFileAccess('.env')).toBe(false)
  })

  it('картинка обычной записи видна всем, а архивной — только автору', async () => {
    const post = await createPost(owner.id)
    const image = await createPostImage(post.id)
    const path = `${image.medium}.webp`
    expect(await decideFileAccess(path)).toBe(true)
    expect(await decideFileAccess(path, stranger.id)).toBe(true)
    await prisma.post.update({ where: { id: post.id }, data: { archived: true } })
    expect(await decideFileAccess(path)).toBe(false)
    expect(await decideFileAccess(path, stranger.id)).toBe(false)
    expect(await decideFileAccess(path, owner.id)).toBe(true)
  })

  it('файлы записи закрытого сообщества — только участникам', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    const post = await createPost(owner.id, 'секрет', { communityId: closed.id })
    const image = await createPostImage(post.id)
    const video = await createVideo(owner.id, post.id)
    await CommunityService.join(friend.id, closed.id)
    await CommunityService.resolveRequest(owner.id, closed.id, friend.id, true)
    for (const path of [`${image.medium}.webp`, video.file]) {
      expect(await decideFileAccess(path, owner.id)).toBe(true)
      expect(await decideFileAccess(path, friend.id)).toBe(true)
      expect(await decideFileAccess(path, stranger.id)).toBe(false)
      expect(await decideFileAccess(path)).toBe(false)
    }
  })

  it('вложения сообщений видят только двое собеседников', async () => {
    const conversation = await prisma.conversation.create({ data: { userAId: owner.id, userBId: friend.id } })
    const message = await prisma.message.create({ data: { conversationId: conversation.id, senderId: owner.id } })
    await prisma.attachment.createMany({
      data: [
        {
          kind: 'image',
          name: 'a.png',
          size: 1,
          file: 'messages/images/aa/big',
          thumb: 'messages/images/bb/small',
          messageId: message.id,
        },
        { kind: 'audio', name: 'a.mp3', size: 1, file: 'messages/audio/x.mp3', messageId: message.id },
      ],
    })
    for (const path of ['messages/images/aa/big.webp', 'messages/images/bb/small.webp', 'messages/audio/x.mp3']) {
      expect(await decideFileAccess(path, owner.id)).toBe(true)
      expect(await decideFileAccess(path, friend.id)).toBe(true)
      expect(await decideFileAccess(path, stranger.id)).toBe(false)
      expect(await decideFileAccess(path)).toBe(false)
    }
  })

  it('музыка и видео из альбома сообщества следуют за сообществом; личные открыты', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    const album = await prisma.video.create({
      data: {
        ownerId: owner.id,
        communityId: closed.id,
        title: 'в',
        file: 'videos/album.mp4',
        size: 1,
        type: 'video/mp4',
      },
    })
    const track = await prisma.music.create({
      data: { owner: owner.id, communityId: closed.id, title: 'т', file: 'music/album.mp3', size: 1 },
    })
    const mine = await createVideo(owner.id, null, 'личное')
    expect(await decideFileAccess(album.file, stranger.id)).toBe(false)
    expect(await decideFileAccess(track.file, stranger.id)).toBe(false)
    expect(await decideFileAccess(album.file, owner.id)).toBe(true)
    expect(await decideFileAccess(mine.file)).toBe(true)
  })

  it('фото альбома и истории сообщества, статья закрытого сообщества', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    await prisma.photo.create({
      data: { userId: owner.id, communityId: closed.id, medium: 'photos/aa/p', small: 'photos/aa/p-s' },
    })
    await prisma.photo.create({ data: { userId: owner.id, medium: 'photos/bb/q', small: 'photos/bb/q-s' } })
    await prisma.story.create({
      data: {
        userId: owner.id,
        communityId: closed.id,
        high: '',
        medium: 'stories/aa/s',
        small: 'stories/aa/s-s',
        vertical: true,
        type: 'webp',
        expiresAt: new Date(Date.now() + 1e6),
      },
    })
    const post = await createPost(owner.id, 'статья', { communityId: closed.id })
    await prisma.article.create({
      data: {
        postId: post.id,
        title: 'Т',
        cover: 'articles/aa/c',
        coverSmall: 'articles/aa/c-s',
        content: JSON.stringify([{ type: 'image', src: 'articles/bb/in', small: 'articles/bb/in-s', caption: '' }]),
      },
    })
    for (const path of [
      'photos/aa/p.webp',
      'photos/aa/p-s.webp',
      'stories/aa/s.webp',
      'articles/aa/c.webp',
      'articles/bb/in.webp',
    ]) {
      expect(await decideFileAccess(path, stranger.id)).toBe(false)
      expect(await decideFileAccess(path, owner.id)).toBe(true)
    }
    expect(await decideFileAccess('photos/bb/q.webp', stranger.id)).toBe(true)
  })
})

describe('кэш решений и вход', () => {
  it('решение запоминается на время, но после сброса учитывает новые права', async () => {
    const post = await createPost(owner.id)
    const image = await createPostImage(post.id)
    const path = `${image.medium}.webp`
    expect(await canAccessFile(path, stranger.id)).toBe(true)
    await prisma.post.update({ where: { id: post.id }, data: { archived: true } })
    // Кэш ещё действует
    expect(await canAccessFile(path, stranger.id)).toBe(true)
    // Через минуту решение пересматривается
    expect(await canAccessFile(path, stranger.id, Date.now() + 60_000)).toBe(false)
    clearAccessCache()
    expect(await canAccessFile(path, stranger.id)).toBe(false)
  })

  it('человек определяется по куке входа, без неё или с чужой — гость', async () => {
    const { refreshToken } = await tokenService.generateTokens({ id: owner.id, email: 'x@x.ru', login: 'x' } as never)
    await tokenService.saveToken(owner.id, refreshToken)
    expect(await viewerFromCookies({ refreshToken })).toBe(owner.id)
    expect(await viewerFromCookies({})).toBeUndefined()
    expect(await viewerFromCookies({ refreshToken: 'мусор' })).toBeUndefined()
  })
})

describe('проверка для nginx (auth_request)', () => {
  const call = async (headers: Record<string, string>, remoteAddress = '127.0.0.1') => {
    let status = 0
    const req = { headers, socket: { remoteAddress } } as unknown as http.IncomingMessage
    const res = {
      writeHead: (code: number) => (status = code),
      end: () => undefined,
    } as unknown as http.ServerResponse
    await storageAuth(req, res)
    return status
  }

  it('отвечает 204 или 403 по исходному адресу и только на запросы с этого компьютера', async () => {
    const post = await createPost(owner.id)
    const image = await createPostImage(post.id)
    const url = `/storage/${image.medium}.webp`
    expect(await call({ 'x-original-uri': url })).toBe(204)
    expect(await call({ 'x-original-uri': `${url}?name=a` })).toBe(204)
    expect(await call({ 'x-original-uri': '/storage/posts/нет.webp' })).toBe(403)
    expect(await call({ 'x-original-uri': '/storage/../.env' })).toBe(403)
    expect(await call({ 'x-original-uri': '/feed' })).toBe(403)
    expect(await call({})).toBe(403)
    // Снаружи этот адрес не отвечает
    expect(await call({ 'x-original-uri': url }, '203.0.113.5')).toBe(403)
  })
})

describe('интроспекция GraphQL', () => {
  const schema = buildSchema('type Query { ok: Boolean }')
  const errors = (production: boolean, query: string) => validate(schema, parse(query), validationRules(production))

  it('при разработке схема доступна, в продакшене — нет', () => {
    const query = '{ __schema { queryType { name } } }'
    expect(errors(false, query)).toEqual([])
    expect(errors(true, query)[0].message).toMatch(/introspection/i)
    expect(errors(true, '{ __type(name: "Query") { name } }')).toHaveLength(1)
  })

  it('обычные запросы в продакшене работают, глубина ограничена в обоих режимах', () => {
    expect(errors(true, '{ ok }')).toEqual([])
    const deep = '{ a { b { c { d { e { f { g { h { i { j { k } } } } } } } } } } }'
    expect(
      validate(buildSchema('type Query { ok: Boolean }'), parse(deep), validationRules(false)).some((e) =>
        /глубокий/.test(e.message),
      ),
    ).toBe(true)
  })
})

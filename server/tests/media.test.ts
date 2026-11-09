import { beforeEach, describe, expect, it } from 'vitest'

import PhotoService from '@/api/photo/service'
import VideoService from '@/api/video/service'

import { createPost, createPostImage, createUsers, createVideo, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

describe('фото: сохранение чужих снимков', () => {
  let author: User
  let viewer: User

  beforeEach(async () => {
    await resetDb()
    ;[author, viewer] = await createUsers(2)
  })

  it('фото из поста сохраняется, повтор безопасен, снятие убирает из сохранённых', async () => {
    const post = await createPost(author.id)
    const image = await createPostImage(post.id)

    await PhotoService.save(viewer.id, 'POST', image.id, true)
    await PhotoService.save(viewer.id, 'POST', image.id, true)
    expect(await prisma.savedPhoto.count()).toBe(1)

    const saved = await PhotoService.listSaved(viewer.id)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ id: image.id, source: 'POST', ownerId: author.id, saved: true })

    await PhotoService.save(viewer.id, 'POST', image.id, false)
    expect(await PhotoService.listSaved(viewer.id)).toEqual([])
  })

  it('фото из альбома сохраняется отдельно от фото из постов', async () => {
    const photo = await prisma.photo.create({ data: { userId: author.id, medium: 'photos/m1' } })
    await PhotoService.save(viewer.id, 'ALBUM', photo.id, true)
    const saved = await PhotoService.listSaved(viewer.id)
    expect(saved[0]).toMatchObject({ id: photo.id, source: 'ALBUM', ownerId: author.id })
  })

  it('своё фото сохранять нельзя, неизвестный источник и несуществующее фото отклоняются', async () => {
    const post = await createPost(author.id)
    const image = await createPostImage(post.id)
    await expect(PhotoService.save(author.id, 'POST', image.id, true)).rejects.toThrow('Своё фото')
    await expect(PhotoService.save(viewer.id, 'WALL', image.id, true)).rejects.toThrow('Неизвестный источник')
    await expect(PhotoService.save(viewer.id, 'POST', 9999, true)).rejects.toThrow('не найдена')
    await expect(PhotoService.save(viewer.id, 'ALBUM', 9999, true)).rejects.toThrow('не найдена')
  })

  it('фото из архивного поста недоступно для сохранения и пропадает из сохранённых', async () => {
    const post = await createPost(author.id)
    const image = await createPostImage(post.id)
    await PhotoService.save(viewer.id, 'POST', image.id, true)

    await prisma.post.update({ where: { id: post.id }, data: { archived: true } })
    expect(await PhotoService.listSaved(viewer.id)).toEqual([])
    const other = await createPost(author.id, 'второй', { archived: true })
    const hiddenImage = await createPostImage(other.id)
    await expect(PhotoService.save(viewer.id, 'POST', hiddenImage.id, true)).rejects.toThrow('недоступна')
  })

  it('галерея профиля объединяет фото постов и альбома и отмечает сохранённые', async () => {
    const post = await createPost(author.id)
    const postImage = await createPostImage(post.id)
    const album = await prisma.photo.create({ data: { userId: author.id, medium: 'photos/m2' } })
    await PhotoService.save(viewer.id, 'POST', postImage.id, true)

    const gallery = await PhotoService.list(author.id, 30, 0, viewer.id)
    expect(gallery).toHaveLength(2)
    expect(gallery.find((p) => p.source === 'POST')).toMatchObject({ id: postImage.id, saved: true })
    expect(gallery.find((p) => p.source === 'ALBUM')).toMatchObject({ id: album.id, saved: false })
    expect(await PhotoService.count(author.id, viewer.id)).toBe(2)
  })

  it('фото из архивного поста видно в галерее только автору', async () => {
    const post = await createPost(author.id, 'скрыт', { archived: true })
    await createPostImage(post.id)
    expect(await PhotoService.list(author.id, 30, 0, viewer.id)).toHaveLength(0)
    expect(await PhotoService.list(author.id, 30, 0, author.id)).toHaveLength(1)
    expect(await PhotoService.count(author.id, viewer.id)).toBe(0)
  })
})

describe('видео: сохранение и ленты', () => {
  let author: User
  let viewer: User

  beforeEach(async () => {
    await resetDb()
    ;[author, viewer] = await createUsers(2)
  })

  it('чужое видео сохраняется и снимается, повтор не дублирует', async () => {
    const video = await createVideo(author.id)
    await VideoService.save(viewer.id, video.id, true)
    await VideoService.save(viewer.id, video.id, true)
    expect(await prisma.savedVideo.count()).toBe(1)

    const saved = await VideoService.listSaved(viewer.id)
    expect(saved[0]).toMatchObject({ id: video.id, saved: true })

    await VideoService.save(viewer.id, video.id, false)
    expect(await VideoService.listSaved(viewer.id)).toEqual([])
  })

  it('своё видео, несуществующее и из архивного поста сохранить нельзя', async () => {
    const own = await createVideo(author.id)
    await expect(VideoService.save(author.id, own.id, true)).rejects.toThrow('Своё видео')
    await expect(VideoService.save(viewer.id, 9999, true)).rejects.toThrow('не найдено')

    const post = await createPost(author.id, 'скрыт', { archived: true })
    const hidden = await createVideo(author.id, post.id)
    await expect(VideoService.save(viewer.id, hidden.id, true)).rejects.toThrow('недоступно')
  })

  it('профиль показывает видео постов и альбома, а архивные посты — только автору', async () => {
    const album = await createVideo(author.id, null, 'из альбома')
    const open = await createPost(author.id, 'открытый')
    const inPost = await createVideo(author.id, open.id, 'из поста')
    const hiddenPost = await createPost(author.id, 'скрытый', { archived: true })
    const hidden = await createVideo(author.id, hiddenPost.id, 'скрытое')

    const asViewer = await VideoService.list(author.id, 30, 0, viewer.id)
    expect(asViewer.map((v) => v.id).sort()).toEqual([album.id, inPost.id].sort())
    expect(await VideoService.count(author.id, viewer.id)).toBe(2)

    const asAuthor = await VideoService.list(author.id, 30, 0, author.id)
    expect(asAuthor.map((v) => v.id).sort()).toEqual([album.id, inPost.id, hidden.id].sort())
  })

  it('общая лента: видео всех пользователей, новые сверху, без архивных постов, с отметкой «сохранено»', async () => {
    const first = await createVideo(author.id, null, 'первое')
    const second = await createVideo(viewer.id, null, 'второе')
    const hiddenPost = await createPost(author.id, 'скрытый', { archived: true })
    await createVideo(author.id, hiddenPost.id, 'скрытое')
    await VideoService.save(viewer.id, first.id, true)

    const feed = await VideoService.listAll(30, 0, viewer.id)
    expect(feed.map((v) => v.id)).toEqual([second.id, first.id])
    expect(feed.find((v) => v.id === first.id)).toMatchObject({ saved: true })
    expect(feed.find((v) => v.id === second.id)).toMatchObject({ saved: false })
  })

  it('постраничная выдача: limit и offset', async () => {
    for (let i = 0; i < 5; i++) await createVideo(author.id, null, `видео ${i}`)
    const page = await VideoService.listAll(2, 2, undefined)
    expect(page).toHaveLength(2)
    expect(await VideoService.listAll(2, 4, undefined)).toHaveLength(1)
  })

  it('удалять можно только своё видео', async () => {
    const own = await createVideo(author.id)
    await expect(VideoService.remove(viewer.id, own.id)).rejects.toThrow('Нет доступа')
    await expect(VideoService.remove(author.id, 9999)).rejects.toThrow('не найдено')

    expect(await VideoService.remove(author.id, own.id)).toBe(true)
    expect(await prisma.video.findUnique({ where: { id: own.id } })).toBeNull()
  })

  it('ролик из поста удаляется, а сам пост остаётся', async () => {
    const post = await createPost(author.id, 'с видео')
    const attached = await createVideo(author.id, post.id)
    const other = await createVideo(author.id, post.id)

    expect(await VideoService.remove(author.id, attached.id)).toBe(true)
    expect(await prisma.video.findUnique({ where: { id: attached.id } })).toBeNull()
    expect(await prisma.video.findUnique({ where: { id: other.id } })).not.toBeNull()
    expect(await prisma.post.findUnique({ where: { id: post.id } })).not.toBeNull()
  })

  it('единственное содержимое поста удалить отдельно нельзя: сначала пост', async () => {
    const post = await createPost(author.id, '  ')
    const only = await createVideo(author.id, post.id)
    await expect(VideoService.remove(author.id, only.id)).rejects.toThrow('Удалите сам пост')
    expect(await prisma.video.findUnique({ where: { id: only.id } })).not.toBeNull()

    // С картинкой пост уже не пустой
    await createPostImage(post.id)
    expect(await VideoService.remove(author.id, only.id)).toBe(true)
  })
})

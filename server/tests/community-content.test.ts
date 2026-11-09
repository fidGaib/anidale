import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityService from '@/api/community/service'
import MusicController from '@/api/music/controller'
import PostService, { MAX_POST_TRACKS } from '@/api/post/service'
import StoryController from '@/api/story/controller'

import { createUsers, prisma, resetDb } from './helpers'

// Аудио и картинки заменяем заглушками, которые запоминают сохранённое и удалённое
const files = vi.hoisted(() => ({
  audioSaved: [] as string[],
  audioRemoved: [] as string[],
  imageRemoved: [] as string[],
  videoRemoved: [] as string[],
}))
vi.mock('@/api/music/audio-service', () => {
  let n = 0
  class AudioStorageService {
    async save() {
      n += 1
      const file = `music/new${n}.mp3`
      files.audioSaved.push(file)
      return { file, size: 10 }
    }
    async remove(file: string) {
      files.audioRemoved.push(file)
    }
  }
  return { default: AudioStorageService }
})
vi.mock('@/api/video/video-service', () => {
  class VideoStorageService {
    async save() {
      return { file: 'videos/new.mp4', size: 1, type: 'video/mp4', title: 'новое' }
    }
    async remove(file: string) {
      files.videoRemoved.push(file)
    }
  }
  return { default: VideoStorageService }
})
vi.mock('@/api/post/file-service', () => {
  let n = 0
  class FileStorageService {
    async saveImage() {
      n += 1
      const medium = `stories/aa/img${n}`
      return { high: '', medium, small: `${medium}-s`, vertical: true, type: 'webp' }
    }
    async removeFiles(images: unknown) {
      const list = Array.isArray(images) ? images : [images]
      for (const image of list)
        files.imageRemoved.push(typeof image === 'string' ? image : (image as { medium: string }).medium)
      return true
    }
  }
  return { default: FileStorageService }
})

type User = Awaited<ReturnType<typeof createUsers>>[number]
const mp3 = (name = 'Песня.mp3') => new File(['x'], name, { type: 'audio/mpeg' })
const png = () => new File(['x'], 'a.png', { type: 'image/png' })

let owner: User
let editor: User
let member: User
let outsider: User
let communityId: number

beforeEach(async () => {
  await resetDb()
  files.audioSaved.length = 0
  files.audioRemoved.length = 0
  files.imageRemoved.length = 0
  files.videoRemoved.length = 0
  ;[owner, editor, member, outsider] = await createUsers(4)
  communityId = (await CommunityService.create(owner.id, { name: 'Клуб' })).id
  for (const user of [editor, member]) await CommunityService.join(user.id, communityId)
  await CommunityService.setRole(owner.id, communityId, editor.id, 'editor')
})

describe('музыка в записях', () => {
  it('к записи прикрепляются загруженные файлы: название берётся из имени файла', async () => {
    const created = await PostService.create(owner.id, '', [], [], null, [mp3('Моя песня.mp3'), mp3('Вторая.ogg')])
    expect(created.post.music.map((t) => [t.title, t.owner, t.postId])).toEqual([
      ['Моя песня', owner.id, created.post.id],
      ['Вторая', owner.id, created.post.id],
    ])
    const found = await PostService.findOne(created.post.id, member.id)
    expect(found?.music).toHaveLength(2)
    expect(found?.music[0].user.id).toBe(owner.id)
  })

  it('можно прикрепить копии треков из своей музыки, чужие и прикреплённые к записям — нельзя', async () => {
    const mine = await prisma.music.create({
      data: { title: 'Моя', artist: 'А', file: 'music/mine.mp3', size: 5, owner: owner.id },
    })
    const theirs = await prisma.music.create({
      data: { title: 'Чужая', artist: 'Б', file: 'music/theirs.mp3', size: 5, owner: member.id },
    })
    const post = await PostService.create(owner.id, 'с музыкой', [], [], null, [], [mine.id])
    expect(post.post.music[0]).toMatchObject({
      title: 'Моя',
      artist: 'А',
      file: 'music/mine.mp3',
      postId: post.post.id,
    })
    // Оригинал в музыке пользователя остался, копия — отдельная запись
    expect(await prisma.music.count({ where: { file: 'music/mine.mp3' } })).toBe(2)
    await expect(PostService.create(owner.id, 'x', [], [], null, [], [theirs.id])).rejects.toThrow('своей музыки')
    await expect(PostService.create(owner.id, 'x', [], [], null, [], [post.post.music[0].id])).rejects.toThrow(
      'своей музыки',
    )
  })

  it('прикреплённые треки не попадают в «мою музыку», общую музыку и поиск', async () => {
    await PostService.create(owner.id, '', [], [], null, [mp3()])
    expect(await MusicController.getMusic(10, 0, owner.id)).toEqual([])
    expect(await MusicController.getAllMusic(10, 0)).toEqual([])
    expect(await MusicController.countAll()).toBe(0)
    expect(await MusicController.getMyFiles(owner.id)).toEqual([])
  })

  it('больше лимита нельзя, ничего не сохраняется', async () => {
    const many = Array.from({ length: MAX_POST_TRACKS + 1 }, () => mp3())
    await expect(PostService.create(owner.id, 'x', [], [], null, many)).rejects.toThrow('не больше')
    expect(files.audioSaved).toEqual([])
    expect(await prisma.post.count()).toBe(0)
  })

  it('трек записи можно взять к себе; удалить отдельно от записи нельзя', async () => {
    const post = await PostService.create(owner.id, '', [], [], null, [mp3()])
    const track = post.post.music[0]
    const added = await MusicController.addToProfile(track.id, member.id)
    expect(added).toMatchObject({ owner: member.id, postId: null, communityId: null })
    expect((await MusicController.getMusic(10, 0, member.id)).map((t) => t.title)).toEqual(['Песня'])
    await expect(MusicController.remove(track.id, owner.id)).rejects.toThrow('удалите запись')
    // Автору при этом уведомление «добавил к себе» не приходит
    expect(await prisma.notification.count({ where: { type: 'track' } })).toBe(0)
  })

  it('архивную запись и предложку чужие не видят, трек из них взять нельзя', async () => {
    const post = await PostService.create(owner.id, '', [], [], null, [mp3()])
    await prisma.post.update({ where: { id: post.post.id }, data: { archived: true } })
    await expect(MusicController.addToProfile(post.post.music[0].id, member.id)).rejects.toThrow('не найден')
    const suggested = await PostService.create(member.id, '', [], [], communityId, [mp3()])
    expect(suggested.post.suggested).toBe(true)
    await expect(MusicController.addToProfile(suggested.post.music[0].id, outsider.id)).rejects.toThrow('не найден')
  })

  it('запись сообщества с музыкой: файлы удаляются вместе с записью, общий файл остаётся', async () => {
    const mine = await prisma.music.create({
      data: { title: 'Моя', artist: 'А', file: 'music/mine.mp3', size: 5, owner: editor.id },
    })
    const post = await PostService.create(editor.id, '', [], [], communityId, [mp3()], [mine.id])
    expect(post.post.suggested).toBe(false)
    expect(post.post.music).toHaveLength(2)
    expect(await PostService.remove(post.post.id, owner.id)).toBe(true)
    expect(await prisma.music.count({ where: { postId: post.post.id } })).toBe(0)
    // Загруженный файл нигде больше не нужен, а файл из «моей музыки» остался у владельца
    expect(files.audioRemoved).toEqual([files.audioSaved[0]])
    expect(await prisma.music.count({ where: { file: 'music/mine.mp3' } })).toBe(1)
  })

  it('музыка только в записи сообщества не попадает на вкладку «Музыка» сообщества', async () => {
    await PostService.create(editor.id, '', [], [], communityId, [mp3()])
    expect(await MusicController.getCommunityMusic(communityId, 10, 0, member.id)).toEqual([])
  })

  it('запись только из музыки допустима, пустая — нет', async () => {
    const PostController = (await import('@/api/post/controller')).default
    const created = await PostController.create(owner.id, '', [], [], null, [mp3()])
    expect(created.post.music).toHaveLength(1)
    await expect(PostController.create(owner.id, ' ', [], [], null, [], [])).rejects.toThrow('пустые')
  })
})

describe('истории сообщества', () => {
  it('публикуют администратор и редактор, остальные — нет; в общую ленту историй они не попадают', async () => {
    await expect(StoryController.create(member.id, png(), 'x', communityId)).rejects.toThrow('только администраторы')
    const story = await StoryController.create(editor.id, png(), ' привет ', communityId)
    expect(story.viewsCount).toBe(0)
    expect(await prisma.story.count({ where: { communityId } })).toBe(1)
    expect(await StoryController.feed(member.id)).toEqual([])
    const list = await StoryController.communityStories(communityId, member.id)
    expect(list.map((s) => [s.text, s.seen, s.viewsCount])).toEqual([['привет', false, null]])
  })

  it('просмотры считаются; число просмотров видят те, кто ведёт содержимое', async () => {
    const story = await StoryController.create(owner.id, png(), '', communityId)
    await StoryController.markViewed(member.id, story.id)
    await StoryController.markViewed(member.id, story.id)
    expect((await StoryController.communityStories(communityId, member.id))[0]).toMatchObject({
      seen: true,
      viewsCount: null,
    })
    expect((await StoryController.communityStories(communityId, editor.id))[0]).toMatchObject({
      seen: false,
      viewsCount: 1,
    })
    expect((await StoryController.viewers(editor.id, story.id)).map((v) => v.user.id)).toEqual([member.id])
    await expect(StoryController.viewers(member.id, story.id)).rejects.toThrow('Нет доступа')
  })

  it('удаляют автор и те, кто ведёт содержимое, участник — нет', async () => {
    const story = await StoryController.create(owner.id, png(), '', communityId)
    await expect(StoryController.remove(member.id, story.id)).rejects.toThrow('Нет доступа')
    expect(await StoryController.remove(editor.id, story.id)).toBe(true)
    expect(files.imageRemoved).toHaveLength(1)
  })

  it('закрытое сообщество показывает истории только участникам', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    await StoryController.create(owner.id, png(), '', closed.id)
    expect(await StoryController.communityStories(closed.id, outsider.id)).toEqual([])
    expect(await StoryController.communityStories(closed.id, undefined)).toEqual([])
    expect(await StoryController.communityStories(closed.id, owner.id)).toHaveLength(1)
  })

  it('удаление сообщества убирает истории и их файлы', async () => {
    await StoryController.create(owner.id, png(), '', communityId)
    expect(await CommunityService.remove(owner.id, communityId)).toBe(true)
    expect(await prisma.story.count()).toBe(0)
    expect(files.imageRemoved).toHaveLength(1)
  })
})

describe('видео из своей коллекции в записях', () => {
  const addVideo = (ownerId: number, file: string, extra: Record<string, unknown> = {}) =>
    prisma.video.create({ data: { ownerId, title: 'Ролик', file, size: 5, type: 'video/mp4', ...extra } })

  it('прикрепляется копия: оригинал остаётся, чужие и уже прикреплённые видео нельзя', async () => {
    const mine = await addVideo(owner.id, 'videos/mine.mp4')
    const theirs = await addVideo(member.id, 'videos/theirs.mp4')
    const post = await PostService.create(owner.id, '', [], [], null, [], [], [mine.id])
    expect(post.post.videos.map((v) => [v.title, v.file, v.postId])).toEqual([
      ['Ролик', 'videos/mine.mp4', post.post.id],
    ])
    expect(await prisma.video.count({ where: { file: 'videos/mine.mp4' } })).toBe(2)
    await expect(PostService.create(owner.id, 'x', [], [], null, [], [], [theirs.id])).rejects.toThrow(
      'своей коллекции',
    )
    await expect(PostService.create(owner.id, 'x', [], [], null, [], [], [post.post.videos[0].id])).rejects.toThrow(
      'своей коллекции',
    )
  })

  it('запись только из видео допустима', async () => {
    const PostController = (await import('@/api/post/controller')).default
    const mine = await addVideo(owner.id, 'videos/mine.mp4')
    const created = await PostController.create(owner.id, '', [], [], null, [], [], [mine.id])
    expect(created.post.videos).toHaveLength(1)
  })

  it('файл общий: удаление записи не стирает видео из коллекции', async () => {
    const mine = await addVideo(owner.id, 'videos/mine.mp4')
    const post = await PostService.create(owner.id, '', [], [], null, [], [], [mine.id])
    expect(await PostService.remove(post.post.id, owner.id)).toBe(true)
    expect(await prisma.video.findUnique({ where: { id: mine.id } })).not.toBeNull()
    expect(files.videoRemoved).toEqual([])
  })

  it('удаление последней записи о файле убирает и сам файл', async () => {
    const mine = await addVideo(owner.id, 'videos/mine.mp4')
    const post = await PostService.create(owner.id, '', [], [], null, [], [], [mine.id])
    const VideoService = (await import('@/api/video/service')).default
    await VideoService.remove(owner.id, mine.id)
    expect(files.videoRemoved).toEqual([])
    await PostService.remove(post.post.id, owner.id)
    expect(files.videoRemoved).toEqual(['videos/mine.mp4'])
  })

  it('записи сообщества можно прикрепить видео из своей коллекции', async () => {
    const mine = await addVideo(editor.id, 'videos/e.mp4')
    const post = await PostService.create(editor.id, '', [], [], communityId, [], [], [mine.id])
    expect(post.post.suggested).toBe(false)
    expect(post.post.videos).toHaveLength(1)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { can, roleRank } from '@/api/community/access'
import DiscussionService from '@/api/community/discussions'
import CommunityService from '@/api/community/service'
import MusicController from '@/api/music/controller'
import PostService from '@/api/post/service'

import { createUsers, prisma, resetDb } from './helpers'

// Аудио и картинки заменяем заглушками
const files = vi.hoisted(() => ({ removed: [] as string[] }))
vi.mock('@/api/music/audio-service', () => {
  let n = 0
  class AudioStorageService {
    async save() {
      n += 1
      return { file: `audio/track${n}.mp3`, size: 10 }
    }
    async remove(file: string) {
      files.removed.push(file)
    }
  }
  return { default: AudioStorageService }
})
vi.mock('@/api/post/file-service', () => {
  class FileStorageService {
    async saveImage() {
      return { high: '', medium: 'communities/aa/x', small: 'communities/aa/x-s', vertical: false, type: 'webp' }
    }
    async removeFiles() {
      return true
    }
  }
  return { default: FileStorageService }
})

type User = Awaited<ReturnType<typeof createUsers>>[number]
const mp3 = () => new File(['x'], 'a.mp3', { type: 'audio/mpeg' })

let owner: User
let admin: User
let editor: User
let moderator: User
let member: User
let communityId: number

beforeEach(async () => {
  await resetDb()
  files.removed.length = 0
  ;[owner, admin, editor, moderator, member] = await createUsers(5)
  const community = await CommunityService.create(owner.id, { name: 'Клуб' })
  communityId = community.id
  for (const user of [admin, editor, moderator, member]) await CommunityService.join(user.id, communityId)
  await CommunityService.setRole(owner.id, communityId, admin.id, 'admin')
  await CommunityService.setRole(owner.id, communityId, editor.id, 'editor')
  await CommunityService.setRole(admin.id, communityId, moderator.id, 'moderator')
})

describe('роли: таблица прав', () => {
  it('кто что может', () => {
    expect([
      can.configure('admin'),
      can.configure('editor'),
      can.configure('moderator'),
      can.configure('member'),
    ]).toEqual([true, false, false, false])
    expect([can.publish('admin'), can.publish('editor'), can.publish('moderator'), can.publish('member')]).toEqual([
      true,
      true,
      false,
      false,
    ])
    expect([can.moderate('admin'), can.moderate('editor'), can.moderate('moderator'), can.moderate(null)]).toEqual([
      true,
      false,
      true,
      false,
    ])
    expect(can.manageContent('editor') && can.manageContent('moderator') && !can.manageContent('member')).toBe(true)
  })

  it('старшинство ролей', () => {
    expect(['member', 'moderator', 'editor', 'admin', 'нет'].map(roleRank)).toEqual([0, 1, 2, 3, 0])
  })
})

describe('роли: назначение', () => {
  it('роль видна в find, список участников идёт от старших к младшим', async () => {
    expect(await CommunityService.find(communityId, editor.id)).toMatchObject({
      role: 'editor',
      isAdmin: false,
      canPublish: true,
      canModerate: false,
      canManagePosts: true,
    })
    expect(await CommunityService.find(communityId, moderator.id)).toMatchObject({
      role: 'moderator',
      canPublish: false,
      canModerate: true,
    })
    expect(await CommunityService.find(communityId, member.id)).toMatchObject({ role: 'member', canManagePosts: false })
    const order = (await CommunityService.members(communityId, 10, 0, owner.id)).map((m) => m.role)
    expect(order).toEqual(['admin', 'admin', 'editor', 'moderator', 'member'])
  })

  it('администратор назначает модераторов и редакторов, но не администраторов', async () => {
    await CommunityService.setRole(admin.id, communityId, member.id, 'editor')
    await expect(CommunityService.setRole(admin.id, communityId, member.id, 'admin')).rejects.toThrow(
      'только создатель',
    )
    await expect(CommunityService.setRole(admin.id, communityId, owner.id, 'member')).rejects.toThrow('создателя')
    // Снять администратора может только создатель
    await expect(CommunityService.setRole(admin.id, communityId, admin.id, 'member')).rejects.toThrow(
      'только создатель',
    )
    await CommunityService.setRole(owner.id, communityId, admin.id, 'member')
    expect((await CommunityService.find(communityId, admin.id))?.role).toBe('member')
  })

  it('роли выдают только администраторы; неизвестная роль и не участник отклоняются', async () => {
    await expect(CommunityService.setRole(editor.id, communityId, member.id, 'moderator')).rejects.toThrow(
      'Нет доступа',
    )
    await expect(CommunityService.setRole(moderator.id, communityId, member.id, 'editor')).rejects.toThrow(
      'Нет доступа',
    )
    await expect(CommunityService.setRole(owner.id, communityId, member.id, 'король')).rejects.toThrow(
      'Неизвестная роль',
    )
    const stranger = (await createUsers(1))[0]
    await expect(CommunityService.setRole(owner.id, communityId, stranger.id, 'editor')).rejects.toThrow('не состоит')
  })
})

describe('роли: публикация', () => {
  it('записи публикуют администратор и редактор, модератор и участник — только предлагают', async () => {
    const byEditor = await PostService.create(editor.id, 'от редактора', [], [], communityId)
    expect(byEditor.post.suggested).toBe(false)
    const byModerator = await PostService.create(moderator.id, 'от модератора', [], [], communityId)
    expect(byModerator.post.suggested).toBe(true)
    const byMember = await PostService.create(member.id, 'от участника', [], [], communityId)
    expect(byMember.post.suggested).toBe(true)
  })

  it('править и удалять записи может каждый, кто ведёт содержимое; участник — нет', async () => {
    const post = await PostService.create(owner.id, 'запись', [], [], communityId)
    await expect(PostService.remove(post.post.id, member.id)).rejects.toThrow('Нет доступа')
    expect(await PostService.remove(post.post.id, moderator.id)).toBe(true)
    const second = await PostService.create(owner.id, 'вторая', [], [], communityId)
    expect(await PostService.remove(second.post.id, editor.id)).toBe(true)
  })
})

describe('роли: модерация', () => {
  it('предложку и заявки решает модератор, редактор — нет', async () => {
    const suggested = await PostService.create(member.id, 'моя', [], [], communityId)
    await expect(CommunityService.suggested(editor.id, communityId, 10, 0)).rejects.toThrow('Нет доступа')
    expect(await CommunityService.suggested(moderator.id, communityId, 10, 0)).toHaveLength(1)
    await CommunityService.review(moderator.id, suggested.post.id, true)
    expect(await CommunityService.posts(communityId, 10, 0, member.id)).toHaveLength(1)
  })

  it('модератор получает уведомления о заявках и предложке', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    await CommunityService.join(admin.id, closed.id)
    await CommunityService.resolveRequest(owner.id, closed.id, admin.id, true)
    await CommunityService.setRole(owner.id, closed.id, admin.id, 'moderator')
    const asker = (await createUsers(1))[0]
    await CommunityService.join(asker.id, closed.id)
    const notes = await prisma.notification.findMany({ where: { userId: admin.id, type: 'community_request' } })
    expect(notes).toHaveLength(1)
  })

  it('блокировать можно только тех, кто ниже по роли; создатель — любого', async () => {
    await expect(CommunityService.ban(moderator.id, communityId, editor.id)).rejects.toThrow('более высокой')
    await expect(CommunityService.ban(moderator.id, communityId, admin.id)).rejects.toThrow('более высокой')
    await expect(CommunityService.ban(editor.id, communityId, member.id)).rejects.toThrow('Нет доступа')
    expect(await CommunityService.ban(moderator.id, communityId, member.id, 'спам')).toBe(true)
    expect(await CommunityService.ban(admin.id, communityId, moderator.id)).toBe(true)
    expect(await CommunityService.ban(owner.id, communityId, admin.id)).toBe(true)
  })

  it('обсуждения: модератор закрепляет и удаляет, редактор — нет', async () => {
    const topic = await DiscussionService.createTopic(member.id, communityId, 'Тема', 'текст')
    await expect(DiscussionService.setFlags(editor.id, topic.id, { pinned: true })).rejects.toThrow('Нет доступа')
    expect(await DiscussionService.setFlags(moderator.id, topic.id, { pinned: true, closed: true })).toBe(true)
    expect((await DiscussionService.addMessage(moderator.id, topic.id, 'модератор пишет в закрытой')).text).toBe(
      'модератор пишет в закрытой',
    )
    expect(await DiscussionService.removeTopic(moderator.id, topic.id)).toBe(true)
  })

  it('настройки, ссылки и контакты — только администратор', async () => {
    await expect(CommunityService.update(editor.id, communityId, { name: 'Взлом' })).rejects.toThrow('Нет доступа')
    await expect(CommunityService.update(moderator.id, communityId, { name: 'Взлом' })).rejects.toThrow('Нет доступа')
    await expect(CommunityService.setLinks(editor.id, communityId, [])).rejects.toThrow('Нет доступа')
    await expect(CommunityService.setContacts(moderator.id, communityId, [])).rejects.toThrow('Нет доступа')
    expect((await CommunityService.update(admin.id, communityId, { name: 'Новое' })).name).toBe('Новое')
  })

  it('«управление» в списке показывает сообщества, где есть любая роль, кроме участника', async () => {
    const managed = await CommunityService.list(moderator.id, { filter: 'managed', limit: 10, offset: 0 })
    expect(managed.map((c) => c.id)).toEqual([communityId])
    expect(await CommunityService.list(member.id, { filter: 'managed', limit: 10, offset: 0 })).toEqual([])
  })
})

describe('музыка сообщества', () => {
  it('загружают администратор и редактор, остальные — нет; трек не попадает в личные и общие списки', async () => {
    await expect(MusicController.create(member.id, 'Песня', 'Группа', mp3(), communityId)).rejects.toThrow(
      'только администраторы',
    )
    await expect(MusicController.create(moderator.id, 'Песня', 'Группа', mp3(), communityId)).rejects.toThrow(
      'только администраторы',
    )
    const track = await MusicController.create(editor.id, 'Песня', 'Группа', mp3(), communityId)
    expect(track.communityId).toBe(communityId)

    expect((await MusicController.getCommunityMusic(communityId, 10, 0, member.id)).map((t) => t.title)).toEqual([
      'Песня',
    ])
    expect(await MusicController.getMusic(10, 0, editor.id)).toEqual([])
    expect(await MusicController.getAllMusic(10, 0)).toEqual([])
    expect(await MusicController.countAll()).toBe(0)
    expect(await MusicController.getMyFiles(editor.id)).toEqual([])
  })

  it('закрытое сообщество показывает музыку только участникам', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    await MusicController.create(owner.id, 'Секрет', undefined, mp3(), closed.id)
    expect(await MusicController.getCommunityMusic(closed.id, 10, 0, member.id)).toEqual([])
    expect(await MusicController.getCommunityMusic(closed.id, 10, 0, undefined)).toEqual([])
    expect(await MusicController.getCommunityMusic(closed.id, 10, 0, owner.id)).toHaveLength(1)
  })

  it('трек сообщества можно взять к себе: копия личная, оригинал остаётся', async () => {
    const track = await MusicController.create(editor.id, 'Песня', 'Группа', mp3(), communityId)
    const mine = await MusicController.addToProfile(track.id, member.id)
    expect(mine.communityId).toBeNull()
    expect((await MusicController.getMusic(10, 0, member.id)).map((t) => t.title)).toEqual(['Песня'])
    await expect(MusicController.addToProfile(track.id, member.id)).rejects.toThrow('уже в вашем профиле')
    // Автор тоже может взять свой трек сообщества в личный профиль
    expect((await MusicController.addToProfile(track.id, editor.id)).communityId).toBeNull()
    // Уведомление автору о «добавил к себе» для музыки сообщества не создаётся
    expect(await prisma.notification.count({ where: { type: 'track' } })).toBe(0)
  })

  it('удаляют автор и те, кто ведёт содержимое; участник — нет', async () => {
    const track = await MusicController.create(editor.id, 'Песня', 'Группа', mp3(), communityId)
    await expect(MusicController.remove(track.id, member.id)).rejects.toThrow('Нет доступа')
    expect(await MusicController.remove(track.id, moderator.id)).toBe(true)
    expect(files.removed).toHaveLength(1)
  })

  it('удаление сообщества убирает его музыку и файлы', async () => {
    await MusicController.create(owner.id, 'Песня', undefined, mp3(), communityId)
    expect(await CommunityService.remove(owner.id, communityId)).toBe(true)
    expect(await prisma.music.count()).toBe(0)
    expect(files.removed).toHaveLength(1)
  })
})

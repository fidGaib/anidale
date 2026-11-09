import { createGraphQLError } from 'graphql-yoga'

import MusicController from '@/api/music/controller'
import NotificationController from '@/api/notification/controller'
import FileStorageService from '@/api/post/file-service'
import PostService from '@/api/post/service'
import VideoService from '@/api/video/service'
import { storagePath } from '@/config'
import prisma from '@/db/db'

import {
  ROLES,
  can,
  canModerate,
  canViewCommunity,
  isBanned,
  isCommunityAdmin,
  isCommunityMember,
  roleRank,
} from './access'
import { notifyAdmins } from './notify'

export const COMMUNITY_LIMITS = {
  name: 60,
  description: 2000,
  status: 140,
  website: 200,
  links: 10,
  linkTitle: 60,
  banReason: 200,
  contacts: 10,
  position: 60,
} as const
const MAX_PAGE = 100
const COMMUNITY_DIR = 'communities/'

const userSel = { select: { id: true, avatar: true, login: true } }

/** Название обязательно: убираем лишние пробелы, проверяем длину. */
export const cleanName = (value: unknown): string => {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw createGraphQLError('Введите название сообщества')
  if (name.length > COMMUNITY_LIMITS.name)
    throw createGraphQLError(`Название длиннее ${COMMUNITY_LIMITS.name} символов`)
  return name
}

/** Сайт или ссылка: только http(s); без схемы дополняется https://. Пустая строка стирает поле. */
export const cleanWebsite = (value: string): string => {
  const text = value.trim()
  if (!text) return ''
  const isHttp = /^https?:\/\//i.test(text)
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text) && !isHttp) {
    throw createGraphQLError('Сайт должен начинаться с http:// или https://')
  }
  return (isHttp ? text : `https://${text}`).slice(0, COMMUNITY_LIMITS.website)
}

/** Список ссылок сообщества: заполненные пары «название — адрес», не больше предела. */
export const cleanLinks = (links: { title: string; url: string }[]): { title: string; url: string }[] => {
  if (links.length > COMMUNITY_LIMITS.links) throw createGraphQLError(`Ссылок не больше ${COMMUNITY_LIMITS.links}`)
  return links
    .map((link) => ({
      title: link.title.replace(/\s+/g, ' ').trim().slice(0, COMMUNITY_LIMITS.linkTitle),
      url: cleanWebsite(link.url),
    }))
    .filter((link) => link.url)
    .map((link) => ({ ...link, title: link.title || link.url }))
}

const listInclude = (viewerId?: number) => ({
  _count: { select: { members: true } },
  members: viewerId ? { where: { userId: viewerId }, select: { role: true }, take: 1 } : false,
})

type CommunityRow = {
  id: number
  name: string
  description: string
  status: string
  website: string
  avatar: string
  cover: string
  isClosed: boolean
  createdAt: Date
  ownerId: number
  _count: { members: number }
  members?: { role: string }[]
}

/** Сообщество в виде для клиента: счётчик участников и отношение просматривающего. */
const view = (row: CommunityRow, viewerId?: number) => {
  const { _count, members, ...rest } = row
  const isMember = (members?.length ?? 0) > 0
  return {
    ...rest,
    membersCount: _count.members,
    isMember,
    role: members?.[0]?.role ?? 'none',
    isAdmin: can.configure(members?.[0]?.role),
    canPublish: can.publish(members?.[0]?.role),
    canModerate: can.moderate(members?.[0]?.role),
    canManagePosts: can.manageContent(members?.[0]?.role),
    isOwner: !!viewerId && row.ownerId === viewerId,
    // Подробности (заявки, ссылки и т.п.) подставляет find()
    canView: !row.isClosed || isMember,
    hasRequested: false,
    isBanned: false,
    requestsCount: 0,
    suggestedCount: 0,
    links: [] as { id: number; title: string; url: string }[],
    contacts: [] as { user: { id: number; avatar: string; login: string }; position: string }[],
  }
}

class CommunityService {
  async list(
    viewerId: number | undefined,
    input: { search?: string | null; filter?: string | null; limit: number; offset: number },
  ) {
    const take = Math.min(Math.max(Math.trunc(input.limit) || 1, 1), MAX_PAGE)
    const skip = Math.max(Math.trunc(input.offset) || 0, 0)
    const filter = input.filter === 'mine' || input.filter === 'managed' ? input.filter : 'all'
    if (filter !== 'all' && !viewerId) return []
    const search = input.search?.trim().slice(0, 100)
    const rows = await prisma.community.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
        ...(filter === 'mine' ? { members: { some: { userId: viewerId } } } : {}),
        ...(filter === 'managed' ? { members: { some: { userId: viewerId, role: { not: 'member' } } } } : {}),
      },
      // Популярные выше, при равенстве — по порядку создания
      orderBy: [{ members: { _count: 'desc' } }, { id: 'asc' }],
      take,
      skip,
      include: listInclude(viewerId),
    })
    return rows.map((row) => view(row, viewerId))
  }

  /** Сколько сообществ подходят под поиск по названию (для общего поиска). */
  async countByName(search: string) {
    return await prisma.community.count({ where: { name: { contains: search, mode: 'insensitive' } } })
  }

  /** Сообщества человека для карточки в профиле: закрытые видны только тем, кто сам в них состоит. */
  async ofUser(userId: number, viewerId: number | undefined, limit: number) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE)
    const rows = await prisma.community.findMany({
      where: {
        members: { some: { userId } },
        ...(viewerId === userId
          ? {}
          : { OR: [{ isClosed: false }, ...(viewerId ? [{ members: { some: { userId: viewerId } } }] : [])] }),
      },
      orderBy: [{ members: { _count: 'desc' } }, { id: 'asc' }],
      take,
      include: listInclude(viewerId),
    })
    const total = await prisma.communityMember.count({ where: { userId } })
    return { total, items: rows.map((row) => view(row, viewerId)) }
  }

  async find(id: number, viewerId?: number) {
    const row = await prisma.community.findUnique({ where: { id }, include: listInclude(viewerId) })
    if (!row) return null
    const base = view(row, viewerId)
    const links = await prisma.communityLink.findMany({ where: { communityId: id }, orderBy: { position: 'asc' } })
    const contactRows = await prisma.communityContact.findMany({
      where: { communityId: id },
      orderBy: { sort: 'asc' },
      include: { user: userSel },
    })
    const contacts = contactRows.map((c) => ({ user: c.user, position: c.position }))
    const [request, banned, requestsCount, suggestedCount] = await Promise.all([
      viewerId
        ? prisma.communityRequest.findUnique({ where: { communityId_userId: { communityId: id, userId: viewerId } } })
        : null,
      viewerId ? isBanned(id, viewerId) : false,
      base.canModerate ? prisma.communityRequest.count({ where: { communityId: id } }) : 0,
      base.canModerate ? prisma.post.count({ where: { communityId: id, suggested: true } }) : 0,
    ])
    return { ...base, links, contacts, hasRequested: request !== null, isBanned: banned, requestsCount, suggestedCount }
  }

  async members(id: number, limit: number, offset: number, viewerId?: number) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE)
    const skip = Math.max(Math.trunc(offset) || 0, 0)
    const community = await prisma.community.findUnique({ where: { id }, select: { ownerId: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    // Участников закрытого сообщества видят только его участники
    if (!(await canViewCommunity(id, viewerId))) return []
    // Старшие роли идут первыми
    const rows = await prisma.communityMember.findMany({
      where: { communityId: id },
      orderBy: [{ rank: 'desc' }, { date: 'asc' }, { id: 'asc' }],
      take,
      skip,
      include: { user: userSel },
    })
    return rows.map((row) => ({
      user: row.user,
      role: row.role,
      isOwner: row.userId === community.ownerId,
      date: row.date,
    }))
  }

  async posts(id: number, limit: number, page: number, viewerId?: number) {
    return await PostService.findByCommunity(id, limit, page, viewerId)
  }

  /** Создаёт сообщество; создатель сразу становится администратором и участником. */
  async create(
    userId: number,
    input: { name: string; description?: string | null; avatar?: File | null; isClosed?: boolean | null },
  ) {
    const name = cleanName(input.name)
    const description = (input.description ?? '').trim()
    if (description.length > COMMUNITY_LIMITS.description) {
      throw createGraphQLError(`Описание длиннее ${COMMUNITY_LIMITS.description} символов`)
    }
    const storage = new FileStorageService(storagePath)
    const avatar = input.avatar ? await storage.saveImage(input.avatar, COMMUNITY_DIR) : null
    try {
      const row = await prisma.community.create({
        data: {
          name,
          description,
          isClosed: !!input.isClosed,
          avatar: avatar?.medium ?? '',
          ownerId: userId,
          members: { create: { userId, role: 'admin', rank: roleRank('admin') } },
        },
        include: listInclude(userId),
      })
      return view(row, userId)
    } catch (error) {
      if (avatar) await storage.removeFiles(avatar).catch(() => undefined)
      throw error
    }
  }

  async update(
    userId: number,
    id: number,
    input: {
      name?: string | null
      description?: string | null
      status?: string | null
      website?: string | null
      isClosed?: boolean | null
      avatar?: File | null
      cover?: File | null
      removeCover?: boolean | null
    },
  ) {
    const current = await prisma.community.findUnique({ where: { id } })
    if (!current) throw createGraphQLError('Сообщество не найдено')
    if (!(await isCommunityAdmin(id, userId))) throw createGraphQLError('Нет доступа')

    const data: Record<string, string | boolean> = {}
    if (typeof input.name === 'string') data.name = cleanName(input.name)
    if (typeof input.description === 'string') {
      const text = input.description.trim()
      if (text.length > COMMUNITY_LIMITS.description) {
        throw createGraphQLError(`Описание длиннее ${COMMUNITY_LIMITS.description} символов`)
      }
      data.description = text
    }
    if (typeof input.status === 'string') data.status = input.status.trim().slice(0, COMMUNITY_LIMITS.status)
    if (typeof input.website === 'string') data.website = cleanWebsite(input.website)
    if (typeof input.isClosed === 'boolean') data.isClosed = input.isClosed

    const storage = new FileStorageService(storagePath)
    const newAvatar = input.avatar ? await storage.saveImage(input.avatar, COMMUNITY_DIR) : null
    let newCover = null
    try {
      newCover = input.cover ? await storage.saveImage(input.cover, COMMUNITY_DIR) : null
      if (newAvatar) data.avatar = newAvatar.medium
      if (newCover) data.cover = newCover.medium
      else if (input.removeCover) data.cover = ''
      if (Object.keys(data).length === 0) throw createGraphQLError('Не предоставлены данные для обновления')

      await prisma.community.update({ where: { id }, data })
      // Сообщество стало открытым: заявки больше не нужны, все ожидающие вступают сразу
      if (data.isClosed === false && current.isClosed) await this.acceptAllRequests(id)
      // Прежние картинки удаляем только после успешной записи
      const old = [
        ...(newAvatar && current.avatar ? [current.avatar] : []),
        ...(data.cover !== undefined && current.cover ? [current.cover] : []),
      ]
      for (const path of old) await storage.removeFiles(path).catch(() => undefined)
      return (await this.find(id, userId)) as NonNullable<Awaited<ReturnType<CommunityService['find']>>>
    } catch (error) {
      if (newAvatar) await storage.removeFiles(newAvatar).catch(() => undefined)
      if (newCover) await storage.removeFiles(newCover).catch(() => undefined)
      throw error
    }
  }

  private async acceptAllRequests(id: number) {
    const requests = await prisma.communityRequest.findMany({ where: { communityId: id } })
    for (const request of requests) {
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: id, userId: request.userId } },
        create: { communityId: id, userId: request.userId },
        update: {},
      })
    }
    await prisma.communityRequest.deleteMany({ where: { communityId: id } })
  }

  /** Заменяет ссылки сообщества. Только администратор. */
  async setLinks(userId: number, id: number, links: { title: string; url: string }[]) {
    if (!(await isCommunityAdmin(id, userId))) throw createGraphQLError('Нет доступа')
    const clean = cleanLinks(links)
    await prisma.$transaction([
      prisma.communityLink.deleteMany({ where: { communityId: id } }),
      prisma.communityLink.createMany({
        data: clean.map((link, position) => ({ ...link, position, communityId: id })),
      }),
    ])
    return (await this.find(id, userId)) as NonNullable<Awaited<ReturnType<CommunityService['find']>>>
  }

  /** Заменяет контакты сообщества: участники с должностями. Только администратор. */
  async setContacts(userId: number, id: number, contacts: { userId: number; position?: string | null }[]) {
    if (!(await isCommunityAdmin(id, userId))) throw createGraphQLError('Нет доступа')
    if (contacts.length > COMMUNITY_LIMITS.contacts) {
      throw createGraphQLError(`Контактов не больше ${COMMUNITY_LIMITS.contacts}`)
    }
    const ids = [...new Set(contacts.map((c) => c.userId))]
    const members = await prisma.communityMember.findMany({
      where: { communityId: id, userId: { in: ids } },
      select: { userId: true },
    })
    if (members.length !== ids.length) throw createGraphQLError('Контактами могут быть только участники сообщества')
    const unique = ids.map((uid) => contacts.find((c) => c.userId === uid) as (typeof contacts)[number])
    await prisma.$transaction([
      prisma.communityContact.deleteMany({ where: { communityId: id } }),
      prisma.communityContact.createMany({
        data: unique.map((c, sort) => ({
          communityId: id,
          userId: c.userId,
          sort,
          position: (c.position ?? '').trim().slice(0, COMMUNITY_LIMITS.position),
        })),
      }),
    ])
    return (await this.find(id, userId)) as NonNullable<Awaited<ReturnType<CommunityService['find']>>>
  }

  /** Вступление. В закрытое сообщество подаётся заявка, которую рассматривает администратор. */
  async join(userId: number, id: number) {
    const community = await prisma.community.findUnique({ where: { id }, select: { id: true, isClosed: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (await isBanned(id, userId)) throw createGraphQLError('Вы в чёрном списке этого сообщества')
    if (community.isClosed) {
      if (!(await isCommunityMember(id, userId))) {
        const existing = await prisma.communityRequest.findUnique({
          where: { communityId_userId: { communityId: id, userId } },
        })
        if (!existing) {
          await prisma.communityRequest.create({ data: { communityId: id, userId } })
          await notifyAdmins(id, userId, 'community_request')
        }
      }
    } else {
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: id, userId } },
        create: { communityId: id, userId },
        update: {},
      })
    }
    return (await this.find(id, userId)) as NonNullable<Awaited<ReturnType<CommunityService['find']>>>
  }

  /** Выход из сообщества или отмена своей заявки. */
  async leave(userId: number, id: number) {
    const community = await prisma.community.findUnique({ where: { id }, select: { ownerId: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (community.ownerId === userId) {
      throw createGraphQLError('Создатель не может выйти из сообщества: удалите его или передайте управление')
    }
    await prisma.communityMember.deleteMany({ where: { communityId: id, userId } })
    await prisma.communityRequest.deleteMany({ where: { communityId: id, userId } })
    // Человек ушёл: в контактах он больше не нужен
    await prisma.communityContact.deleteMany({ where: { communityId: id, userId } })
    return (await this.find(id, userId)) as NonNullable<Awaited<ReturnType<CommunityService['find']>>>
  }

  /** Заявки на вступление, старые первыми. Только администратор. */
  async requests(adminId: number, id: number, limit: number, offset: number) {
    if (!(await canModerate(id, adminId))) throw createGraphQLError('Нет доступа')
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE)
    const rows = await prisma.communityRequest.findMany({
      where: { communityId: id },
      orderBy: { id: 'asc' },
      take,
      skip: Math.max(Math.trunc(offset) || 0, 0),
      include: { user: userSel },
    })
    return rows.map((row) => ({ user: row.user, role: 'member', isOwner: false, date: row.date }))
  }

  /** Принять заявку (человек становится участником) или отклонить. */
  async resolveRequest(adminId: number, id: number, userId: number, accept: boolean) {
    if (!(await canModerate(id, adminId))) throw createGraphQLError('Нет доступа')
    const request = await prisma.communityRequest.findUnique({
      where: { communityId_userId: { communityId: id, userId } },
    })
    if (!request) throw createGraphQLError('Заявка не найдена')
    await prisma.communityRequest.delete({ where: { id: request.id } })
    if (accept) {
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: id, userId } },
        create: { communityId: id, userId },
        update: {},
      })
      const community = await prisma.community.findUnique({ where: { id }, select: { name: true } })
      await NotificationController.notify(userId, adminId, 'community_accept', {
        communityId: id,
        text: community?.name ?? '',
      })
    }
    return true
  }

  /** Приглашение в сообщество: участник зовёт человека, тому приходит уведомление. */
  async invite(userId: number, id: number, targetId: number) {
    const community = await prisma.community.findUnique({ where: { id }, select: { isClosed: true, name: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (!(await isCommunityMember(id, userId))) throw createGraphQLError('Приглашать могут только участники')
    if (community.isClosed && !(await canModerate(id, userId))) {
      throw createGraphQLError('В закрытое сообщество приглашают только администраторы')
    }
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })
    if (!target) throw createGraphQLError('Пользователь не найден')
    if (await isCommunityMember(id, targetId)) throw createGraphQLError('Этот человек уже в сообществе')
    if (await isBanned(id, targetId)) throw createGraphQLError('Этот человек в чёрном списке сообщества')
    await NotificationController.notify(targetId, userId, 'community_invite', { communityId: id, text: community.name })
    return true
  }

  /**
   * Чёрный список: исключает человека, снимает его заявку и запрещает вступать и предлагать записи.
   * Блокировать можно только тех, кто ниже по роли; создателя — никого.
   */
  async ban(adminId: number, id: number, userId: number, reason?: string | null) {
    const community = await prisma.community.findUnique({ where: { id }, select: { ownerId: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (!(await canModerate(id, adminId))) throw createGraphQLError('Нет доступа')
    if (userId === community.ownerId) throw createGraphQLError('Создателя нельзя заблокировать')
    const [actor, target] = await Promise.all([
      prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: id, userId: adminId } } }),
      prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: id, userId } } }),
    ])
    // Создатель блокирует любого; остальные — только тех, кто ниже их по роли
    if (target && adminId !== community.ownerId && roleRank(target.role) >= roleRank(actor?.role)) {
      throw createGraphQLError('Нельзя заблокировать участника с такой же или более высокой ролью')
    }
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!targetUser) throw createGraphQLError('Пользователь не найден')
    const text = (reason ?? '').trim().slice(0, COMMUNITY_LIMITS.banReason)
    await prisma.$transaction([
      prisma.communityMember.deleteMany({ where: { communityId: id, userId } }),
      prisma.communityRequest.deleteMany({ where: { communityId: id, userId } }),
      prisma.communityContact.deleteMany({ where: { communityId: id, userId } }),
      prisma.communityBan.upsert({
        where: { communityId_userId: { communityId: id, userId } },
        create: { communityId: id, userId, reason: text },
        update: { reason: text },
      }),
    ])
    return true
  }

  async unban(adminId: number, id: number, userId: number) {
    if (!(await canModerate(id, adminId))) throw createGraphQLError('Нет доступа')
    await prisma.communityBan.deleteMany({ where: { communityId: id, userId } })
    return true
  }

  async bans(adminId: number, id: number, limit: number, offset: number) {
    if (!(await canModerate(id, adminId))) throw createGraphQLError('Нет доступа')
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE)
    const rows = await prisma.communityBan.findMany({
      where: { communityId: id },
      orderBy: { id: 'desc' },
      take,
      skip: Math.max(Math.trunc(offset) || 0, 0),
      include: { user: userSel },
    })
    return rows.map((row) => ({ user: row.user, reason: row.reason, date: row.date }))
  }

  /** Предложенные записи, ожидающие решения. Только администратор. */
  async suggested(adminId: number, id: number, limit: number, page: number) {
    return await PostService.findSuggested(id, adminId, limit, page)
  }

  /** Решение по предложенной записи; автору приходит уведомление, если запись принята. */
  async review(adminId: number, postId: number, approve: boolean) {
    const { authorId, communityId } = await PostService.reviewSuggested(adminId, postId, approve)
    if (approve) {
      const community = await prisma.community.findUnique({ where: { id: communityId }, select: { name: true } })
      await NotificationController.notify(authorId, adminId, 'community_accept', {
        communityId,
        postId,
        text: community?.name ?? '',
      })
    }
    return true
  }

  /**
   * Назначает роль участнику: member, moderator, editor или admin.
   * Роль администратора выдаёт и снимает только создатель; остальные роли — любой администратор.
   */
  async setRole(userId: number, id: number, targetId: number, role: string) {
    const community = await prisma.community.findUnique({ where: { id }, select: { ownerId: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (!ROLES.includes(role as (typeof ROLES)[number])) throw createGraphQLError('Неизвестная роль')
    if (!(await isCommunityAdmin(id, userId))) throw createGraphQLError('Нет доступа')
    if (targetId === community.ownerId) throw createGraphQLError('Права создателя изменить нельзя')
    const member = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId: targetId } },
    })
    if (!member) throw createGraphQLError('Пользователь не состоит в сообществе')
    const touchesAdmin = role === 'admin' || member.role === 'admin'
    if (touchesAdmin && community.ownerId !== userId) {
      throw createGraphQLError('Роль администратора выдаёт и снимает только создатель')
    }
    await prisma.communityMember.update({ where: { id: member.id }, data: { role, rank: roleRank(role) } })
    return true
  }

  /** Удаляет сообщество: сначала его записи (вместе с файлами), потом картинки и само сообщество. */
  async remove(userId: number, id: number) {
    const community = await prisma.community.findUnique({ where: { id } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    if (community.ownerId !== userId) throw createGraphQLError('Нет доступа')
    const posts = await prisma.post.findMany({ where: { communityId: id }, select: { id: true, owner: true } })
    for (const post of posts) await PostService.remove(post.id, post.owner)
    // Альбомы живут отдельно от записей: их файлы тоже убираем
    await MusicController.removeCommunityTracks(id)
    const [photos, videos] = await Promise.all([
      prisma.photo.findMany({ where: { communityId: id } }),
      prisma.video.findMany({ where: { communityId: id } }),
    ])
    const stories = await prisma.story.findMany({ where: { communityId: id } })
    const storage = new FileStorageService(storagePath)
    for (const story of stories) {
      await storage.removeFiles({ high: story.high, medium: story.medium, small: story.small }).catch(() => undefined)
    }
    for (const photo of photos)
      await storage.removeFiles({ medium: photo.medium, small: photo.small }).catch(() => undefined)
    await prisma.community.delete({ where: { id } })
    // Файлы альбома: общие с чьими-то записями остаются
    await VideoService.removeFilesIfUnused(videos.map((video) => video.file))
    for (const path of [community.avatar, community.cover]) {
      if (path) await storage.removeFiles(path).catch(() => undefined)
    }
    return true
  }
}

export default new CommunityService()

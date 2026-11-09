import { createGraphQLError } from 'graphql-yoga'

import prisma from '@/db/db'

import { canModerate, canViewCommunity, isBanned, isCommunityMember } from './access'

export const DISCUSSION_LIMITS = { title: 120, text: 3000, topics: 100, messages: 100 } as const

const userSel = { select: { id: true, avatar: true, login: true } }

const cleanTitle = (value: string): string => {
  const title = value.replace(/\s+/g, ' ').trim()
  if (!title) throw createGraphQLError('Введите название темы')
  if (title.length > DISCUSSION_LIMITS.title) {
    throw createGraphQLError(`Название темы длиннее ${DISCUSSION_LIMITS.title} символов`)
  }
  return title
}

const cleanText = (value: string): string => {
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (!text) throw createGraphQLError('Введите сообщение')
  if (text.length > DISCUSSION_LIMITS.text) {
    throw createGraphQLError(`Сообщение длиннее ${DISCUSSION_LIMITS.text} символов`)
  }
  return text
}

const page = (limit: number, max: number) => Math.min(Math.max(Math.trunc(limit) || 1, 1), max)

/** Участник может писать в обсуждениях: он состоит в сообществе и не заблокирован. */
const assertCanWrite = async (communityId: number, userId: number) => {
  if (await isBanned(communityId, userId)) throw createGraphQLError('Вы в чёрном списке сообщества')
  if (!(await isCommunityMember(communityId, userId))) {
    throw createGraphQLError('Писать в обсуждениях могут только участники сообщества')
  }
}

/** Тема со сведениями для списка: автор, число сообщений и начало последнего. */
const topicView = async (topic: {
  id: number
  title: string
  pinned: boolean
  closed: boolean
  date: Date
  lastMessageAt: Date
  communityId: number
  author: { id: number; avatar: string; login: string }
}) => {
  const [messagesCount, last] = await Promise.all([
    prisma.discussionMessage.count({ where: { topicId: topic.id } }),
    prisma.discussionMessage.findFirst({
      where: { topicId: topic.id },
      orderBy: { id: 'desc' },
      select: { text: true },
    }),
  ])
  return { ...topic, messagesCount, lastText: (last?.text ?? '').replace(/\s+/g, ' ').slice(0, 100) }
}

class DiscussionService {
  /** Темы сообщества: закреплённые сверху, дальше по времени последнего сообщения. */
  async topics(communityId: number, limit: number, offset: number, viewerId?: number) {
    if (!(await canViewCommunity(communityId, viewerId))) return []
    const rows = await prisma.discussionTopic.findMany({
      where: { communityId },
      orderBy: [{ pinned: 'desc' }, { lastMessageAt: 'desc' }, { id: 'desc' }],
      take: page(limit, DISCUSSION_LIMITS.topics),
      skip: Math.max(Math.trunc(offset) || 0, 0),
      include: { author: userSel },
    })
    return await Promise.all(rows.map(topicView))
  }

  async topic(topicId: number, viewerId?: number) {
    const row = await prisma.discussionTopic.findUnique({ where: { id: topicId }, include: { author: userSel } })
    if (!row || !(await canViewCommunity(row.communityId, viewerId))) return null
    return await topicView(row)
  }

  /** Создаёт тему вместе с первым сообщением. */
  async createTopic(userId: number, communityId: number, title: string, text: string) {
    const community = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } })
    if (!community) throw createGraphQLError('Сообщество не найдено')
    await assertCanWrite(communityId, userId)
    const topic = await prisma.discussionTopic.create({
      data: {
        title: cleanTitle(title),
        communityId,
        authorId: userId,
        messages: { create: { text: cleanText(text), authorId: userId } },
      },
      include: { author: userSel },
    })
    return await topicView(topic)
  }

  async messages(topicId: number, limit: number, offset: number, viewerId?: number) {
    const topic = await prisma.discussionTopic.findUnique({ where: { id: topicId }, select: { communityId: true } })
    if (!topic || !(await canViewCommunity(topic.communityId, viewerId))) return []
    return await prisma.discussionMessage.findMany({
      where: { topicId },
      orderBy: { id: 'asc' },
      take: page(limit, DISCUSSION_LIMITS.messages),
      skip: Math.max(Math.trunc(offset) || 0, 0),
      include: { author: userSel },
    })
  }

  async addMessage(userId: number, topicId: number, text: string) {
    const topic = await prisma.discussionTopic.findUnique({ where: { id: topicId } })
    if (!topic) throw createGraphQLError('Тема не найдена')
    await assertCanWrite(topic.communityId, userId)
    // В закрытой теме пишут только администраторы
    if (topic.closed && !(await canModerate(topic.communityId, userId))) {
      throw createGraphQLError('Тема закрыта')
    }
    const [message] = await prisma.$transaction([
      prisma.discussionMessage.create({
        data: { topicId, authorId: userId, text: cleanText(text) },
        include: { author: userSel },
      }),
      prisma.discussionTopic.update({ where: { id: topicId }, data: { lastMessageAt: new Date() } }),
    ])
    return message
  }

  /** Сообщение удаляет автор или администратор сообщества. */
  async removeMessage(userId: number, messageId: number) {
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      include: { topic: { select: { communityId: true } } },
    })
    if (!message) throw createGraphQLError('Сообщение не найдено')
    if (message.authorId !== userId && !(await canModerate(message.topic.communityId, userId))) {
      throw createGraphQLError('Нет доступа')
    }
    await prisma.discussionMessage.delete({ where: { id: messageId } })
    return true
  }

  /** Тему удаляет её автор или администратор. */
  async removeTopic(userId: number, topicId: number) {
    const topic = await prisma.discussionTopic.findUnique({ where: { id: topicId } })
    if (!topic) throw createGraphQLError('Тема не найдена')
    if (topic.authorId !== userId && !(await canModerate(topic.communityId, userId))) {
      throw createGraphQLError('Нет доступа')
    }
    await prisma.discussionTopic.delete({ where: { id: topicId } })
    return true
  }

  /** Закрепить или закрыть тему: только администратор. */
  async setFlags(userId: number, topicId: number, flags: { pinned?: boolean | null; closed?: boolean | null }) {
    const topic = await prisma.discussionTopic.findUnique({ where: { id: topicId } })
    if (!topic) throw createGraphQLError('Тема не найдена')
    if (!(await canModerate(topic.communityId, userId))) throw createGraphQLError('Нет доступа')
    await prisma.discussionTopic.update({
      where: { id: topicId },
      data: {
        ...(typeof flags.pinned === 'boolean' ? { pinned: flags.pinned } : {}),
        ...(typeof flags.closed === 'boolean' ? { closed: flags.closed } : {}),
      },
    })
    return true
  }
}

export default new DiscussionService()

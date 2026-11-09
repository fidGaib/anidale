import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import { Conversation, Message } from '@/db/models/message-model'
import User from '@/db/models/user-model'
import { isOnline } from '@/handlers/presence'
import { io } from '@/index'

import AttachmentService, { MAX_ATTACHMENTS, MAX_TOTAL_SIZE, SavedAttachment } from './attachment-service'
import {
  ALLOWED_REACTIONS,
  DbAttachment,
  MAX_CONVERSATIONS,
  MAX_FORWARD_RECIPIENTS,
  MAX_PAGE_LIMIT,
  MAX_PINNED,
  MAX_SELECTION,
  MAX_TEXT_LENGTH,
  NewMessage,
  PREVIEW_LENGTH,
  ReplyPreview,
  messageInclude,
  pair,
  room,
  toMessage,
  userSelect,
} from './mappers'

class MessageController {
  private service() {
    return new AttachmentService(storagePath)
  }

  /**
   * Добавляет к сообщениям краткое содержимое оригинала для ответов (replyTo).
   * viewer: просматривающий пользователь; оригинал, который он очистил или скрыл у себя, ему не показывается.
   * Без viewer (рассылка по сокету) фильтр не применяется. Один запрос на всю пачку.
   */
  private async withReplies<T extends { replyToId: number | null }>(
    messages: T[],
    viewer?: { me: number; cleared: number },
  ): Promise<(T & { replyTo: ReplyPreview | null })[]> {
    const ids = [...new Set(messages.flatMap((m) => (m.replyToId ? [m.replyToId] : [])))]
    const previews = new Map<number, ReplyPreview>()
    if (ids.length > 0) {
      const originals = await Message.findMany({
        where: {
          id: { in: ids, ...(viewer ? { gt: viewer.cleared } : {}) },
          ...(viewer ? { NOT: { hiddenBy: { has: viewer.me } } } : {}),
        },
        select: { id: true, senderId: true, text: true, attachments: { select: { kind: true, name: true }, take: 1 } },
      })
      for (const o of originals) {
        previews.set(o.id, {
          id: o.id,
          senderId: o.senderId,
          text: o.text.slice(0, PREVIEW_LENGTH),
          attachmentKind: o.attachments[0]?.kind ?? null,
          attachmentName: o.attachments[0]?.name ?? null,
        })
      }
    }
    return messages.map((m) => ({ ...m, replyTo: m.replyToId ? (previews.get(m.replyToId) ?? null) : null }))
  }

  /** Сообщение, видимое пользователю: он участник диалога, не очистил и не скрыл его. */
  private async findVisible(me: number, messageId: number) {
    const message = await Message.findUnique({
      where: { id: messageId },
      include: { ...messageInclude, conversation: true },
    })
    const conv = message?.conversation
    if (!message || !conv || (conv.userAId !== me && conv.userBId !== me)) {
      throw createGraphQLError('Сообщение не найдено')
    }
    const cleared = me === conv.userAId ? conv.clearedA : conv.clearedB
    if (message.id <= cleared || message.hiddenBy.includes(me)) throw createGraphQLError('Сообщение не найдено')
    return { message, conv }
  }

  /**
   * Удаляет файлы, на которые больше не ссылается ни одно вложение.
   * Одни и те же файлы могут быть у нескольких сообщений (пересылка не копирует их).
   * Вызывать после удаления строк из БД.
   */
  private async releaseFiles(attachments: DbAttachment[]) {
    const service = this.service()
    const seen = new Set<string>()
    for (const attachment of attachments) {
      if (seen.has(attachment.file)) continue
      seen.add(attachment.file)
      const stillUsed = await prisma.attachment.count({ where: { file: attachment.file } })
      if (stillUsed === 0) await service.remove(attachment as SavedAttachment)
    }
  }

  /** Записывает сообщение, обновляет диалог и рассылает его участникам. */
  private async persist(from: number, to: number, data: NewMessage) {
    const [a, b] = pair(from, to)
    const message = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: { userAId_userBId: { userAId: a, userBId: b } },
        create: { userAId: a, userBId: b },
        update: {},
      })
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: from,
          text: data.text,
          fwdUserId: data.fwdUserId ?? null,
          fwdLogin: data.fwdLogin ?? '',
          replyToId: data.replyToId ?? null,
          attachments: {
            create: data.attachments.map((s) => ({
              kind: s.kind,
              name: s.name,
              size: s.size,
              file: s.file,
              thumb: s.thumb,
              high: s.high,
            })),
          },
        },
        include: messageInclude,
      })
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageId: created.id,
          lastMessageAt: created.date,
          // Свои сообщения прочитаны автоматически
          ...(from === a ? { readA: created.id } : { readB: created.id }),
          // Новое сообщение возвращает диалог из архива, если он не заглушён (как в Телеграме)
          ...(conversation.archivedA && !conversation.mutedA ? { archivedA: false } : {}),
          ...(conversation.archivedB && !conversation.mutedB ? { archivedB: false } : {}),
        },
      })
      return created
    })
    const [result] = await this.withReplies([toMessage(message, a, b)])
    // Получателю и остальным вкладкам отправителя
    io.to(room(to)).to(room(from)).emit('newMessage', { message: result })
    return result
  }

  async send(from: number, to: number, text: string | undefined, files: File[] | undefined, replyTo?: number) {
    if (from === to) throw createGraphQLError('Нельзя написать самому себе')
    const clean = (text ?? '').trim()
    if (clean.length > MAX_TEXT_LENGTH) throw createGraphQLError(`Сообщение длиннее ${MAX_TEXT_LENGTH} символов`)
    const list = files ?? []
    if (list.length > MAX_ATTACHMENTS) throw createGraphQLError(`Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`)
    if (!clean && list.length === 0) throw createGraphQLError('Сообщение пустое')
    if (list.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) {
      throw createGraphQLError(`Вложения больше ${MAX_TOTAL_SIZE / 1024 / 1024} МБ в сумме`)
    }

    const recipient = await User.findUnique({ where: { id: to }, select: { id: true } })
    if (!recipient) throw createGraphQLError('Пользователь не найден')

    // Отвечать можно на видимое сообщение именно этого диалога, а не на чужое по подставленному id
    if (replyTo) {
      const [a, b] = pair(from, to)
      const original = await this.findVisible(from, replyTo).catch(() => null)
      if (!original || original.conv.userAId !== a || original.conv.userBId !== b) {
        throw createGraphQLError('Сообщение, на которое вы отвечаете, не найдено')
      }
    }

    // Файлы сохраняем до записи в БД. Если хоть один не прошёл, остальные удаляем, чтобы не копить мусор
    const service = this.service()
    const results = await Promise.allSettled(list.map((file) => service.save(file)))
    const saved = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) {
      await Promise.all(saved.map((a) => service.remove(a)))
      throw failed.reason
    }

    try {
      return await this.persist(from, to, { text: clean, attachments: saved, replyToId: replyTo ?? null })
    } catch (error) {
      await Promise.all(saved.map((s) => service.remove(s)))
      throw error
    }
  }

  /** Сообщения диалога порядком «новые сверху». beforeId — подгрузка более старых. */
  async list(me: number, other: number, beforeId: number | undefined, limit: number) {
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) return []
    const cleared = me === a ? conversation.clearedA : conversation.clearedB
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const messages = await Message.findMany({
      where: {
        conversationId: conversation.id,
        id: { gt: cleared, ...(beforeId ? { lt: beforeId } : {}) },
        NOT: { hiddenBy: { has: me } },
      },
      orderBy: { id: 'desc' },
      take,
      include: messageInclude,
    })
    return await this.withReplies(
      messages.map((m) => toMessage(m, a, b)),
      { me, cleared },
    )
  }

  async conversations(me: number) {
    const conversations = await Conversation.findMany({
      where: {
        OR: [
          { userAId: me, lastMessageId: { gt: prisma.conversation.fields.clearedA } },
          { userBId: me, lastMessageId: { gt: prisma.conversation.fields.clearedB } },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      take: MAX_CONVERSATIONS,
      include: { userA: { select: userSelect }, userB: { select: userSelect } },
    })

    const items = await Promise.all(
      conversations.map(async (c) => {
        const mine = me === c.userAId
        const cleared = mine ? c.clearedA : c.clearedB
        // Последнее сообщение, которое видит именно этот пользователь (часть может быть скрыта им или удалена)
        const last = await Message.findFirst({
          where: { conversationId: c.id, id: { gt: cleared }, NOT: { hiddenBy: { has: me } } },
          orderBy: { id: 'desc' },
          include: { attachments: true },
        })
        if (!last) return null
        const threshold = Math.max(mine ? c.readA : c.readB, cleared)
        const unread = await Message.count({
          where: {
            conversationId: c.id,
            senderId: { not: me },
            id: { gt: threshold },
            NOT: { hiddenBy: { has: me } },
          },
        })
        return {
          user: mine ? c.userB : c.userA,
          lastMessage: toMessage(last, c.userAId, c.userBId),
          unread,
          muted: mine ? c.mutedA : c.mutedB,
          archived: mine ? c.archivedA : c.archivedB,
          pinned: mine ? c.topA : c.topB,
        }
      }),
    )
    return items
      .flatMap((item) => (item ? [item] : []))
      .sort(
        (x, y) =>
          // Закреплённые диалоги сверху, внутри групп — свежие выше
          Number(y.pinned) - Number(x.pinned) || y.lastMessage.date.getTime() - x.lastMessage.date.getTime(),
      )
  }

  /** Настройки диалога у себя. Диалога ещё нет (нет переписки): настраивать нечего. */
  async setSettings(
    me: number,
    other: number,
    settings: { muted?: boolean | null; archived?: boolean | null; pinned?: boolean | null },
  ) {
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) throw createGraphQLError('Диалог не найден')
    const mine = me === a
    const data: Record<string, boolean> = {}
    if (typeof settings.muted === 'boolean') data[mine ? 'mutedA' : 'mutedB'] = settings.muted
    if (typeof settings.archived === 'boolean') data[mine ? 'archivedA' : 'archivedB'] = settings.archived
    if (typeof settings.pinned === 'boolean') data[mine ? 'topA' : 'topB'] = settings.pinned
    if (Object.keys(data).length) await Conversation.update({ where: { id: conversation.id }, data })
    // Остальные вкладки пользователя обновят список
    io.to(room(me)).emit('conversationSettings', { userA: a, userB: b })
    return true
  }

  /** Реакция на сообщение. Своя реакция одна: новая заменяет прежнюю, повтор той же снимает её. */
  async react(me: number, id: number, emoji: string | null | undefined) {
    const { message, conv } = await this.findVisible(me, id)
    if (emoji && !ALLOWED_REACTIONS.includes(emoji)) throw createGraphQLError('Такая реакция недоступна')
    const current = message.reactions.find((r) => r.userId === me)
    if (!emoji || current?.emoji === emoji) {
      if (current) await prisma.messageReaction.deleteMany({ where: { messageId: id, userId: me } })
    } else {
      await prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId: id, userId: me } },
        create: { messageId: id, userId: me, emoji },
        update: { emoji },
      })
    }
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: id },
      select: { userId: true, emoji: true },
      orderBy: { id: 'asc' },
    })
    io.to(room(conv.userAId))
      .to(room(conv.userBId))
      .emit('messageReactions', { userA: conv.userAId, userB: conv.userBId, id, reactions })
    const [result] = await this.withReplies([toMessage({ ...message, reactions }, conv.userAId, conv.userBId)], {
      me,
      cleared: me === conv.userAId ? conv.clearedA : conv.clearedB,
    })
    return result
  }

  /** Поиск по тексту сообщений диалога среди видимых пользователю. Новые сверху. */
  async search(me: number, other: number, query: string, beforeId: number | undefined, limit: number) {
    const needle = query.trim().slice(0, 100)
    if (!needle) return []
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) return []
    const cleared = me === a ? conversation.clearedA : conversation.clearedB
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const messages = await Message.findMany({
      where: {
        conversationId: conversation.id,
        id: { gt: cleared, ...(beforeId ? { lt: beforeId } : {}) },
        text: { contains: needle, mode: 'insensitive' },
        NOT: { hiddenBy: { has: me } },
      },
      orderBy: { id: 'desc' },
      take,
      include: messageInclude,
    })
    return await this.withReplies(
      messages.map((m) => toMessage(m, a, b)),
      { me, cleared },
    )
  }

  async markRead(me: number, other: number) {
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) return true
    await Conversation.update({
      where: { id: conversation.id },
      data: me === a ? { readA: conversation.lastMessageId } : { readB: conversation.lastMessageId },
    })
    // Собеседник видит, что его сообщения прочитаны
    io.to(room(other)).emit('messagesRead', { reader: me, upTo: conversation.lastMessageId })
    return true
  }

  /** До какого сообщения дочитал собеседник; нужно для галочек «прочитано» у моих сообщений. */
  async peerRead(me: number, other: number) {
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) return 0
    return me === a ? conversation.readB : conversation.readA
  }

  // ---------- действия над отдельным сообщением ----------

  /** Правка текста своего сообщения. Вложения не меняются. */
  async edit(me: number, id: number, text: string) {
    const { message, conv } = await this.findVisible(me, id)
    if (message.senderId !== me) throw createGraphQLError('Редактировать можно только свои сообщения')
    const clean = text.trim()
    if (clean.length > MAX_TEXT_LENGTH) throw createGraphQLError(`Сообщение длиннее ${MAX_TEXT_LENGTH} символов`)
    if (!clean && message.attachments.length === 0) throw createGraphQLError('Сообщение пустое')

    const updated = await Message.update({
      where: { id },
      data: { text: clean, editedAt: new Date() },
      include: messageInclude,
    })
    const [result] = await this.withReplies([toMessage(updated, conv.userAId, conv.userBId)])
    io.to(room(conv.userAId)).to(room(conv.userBId)).emit('messageUpdated', { message: result })
    return result
  }

  /**
   * forEveryone: стереть у обоих (только своё сообщение).
   * Иначе сообщение скрывается у вызвавшего; когда скрыли оба, оно стирается окончательно.
   */
  async deleteMessage(me: number, id: number, forEveryone: boolean) {
    const { message, conv } = await this.findVisible(me, id)
    const payload = { userA: conv.userAId, userB: conv.userBId, ids: [id] }

    if (forEveryone) {
      if (message.senderId !== me) throw createGraphQLError('Удалить у всех можно только свои сообщения')
      await this.eraseMessage(conv.id, message.id, message.attachments)
      io.to(room(conv.userAId)).to(room(conv.userBId)).emit('messagesDeleted', payload)
      return true
    }

    const hidden = message.hiddenBy.includes(me) ? message.hiddenBy : [...message.hiddenBy, me]
    if (hidden.includes(conv.userAId) && hidden.includes(conv.userBId)) {
      // Скрыли оба: хранить незачем
      await this.eraseMessage(conv.id, message.id, message.attachments)
    } else {
      await Message.update({ where: { id }, data: { hiddenBy: hidden } })
    }
    io.to(room(me)).emit('messagesDeleted', payload)
    return true
  }

  /**
   * Стирает сообщение, освобождает файлы и приводит диалог в порядок:
   * снимает закрепление и пересчитывает «последнее сообщение». Если сообщений не осталось, диалог удаляется.
   */
  private async eraseMessage(conversationId: number, messageId: number, attachments: DbAttachment[]) {
    await Message.delete({ where: { id: messageId } })
    await this.releaseFiles(attachments)

    const conv = await Conversation.findUnique({ where: { id: conversationId } })
    if (!conv) return
    const last = await Message.findFirst({
      where: { conversationId },
      orderBy: { id: 'desc' },
      select: { id: true, date: true },
    })
    if (!last) {
      await Conversation.delete({ where: { id: conversationId } })
      return
    }
    const updated = await Conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: last.id,
        lastMessageAt: last.date,
        ...(conv.pinnedIds.includes(messageId) ? { pinnedIds: conv.pinnedIds.filter((x) => x !== messageId) } : {}),
      },
    })
    // Если все оставшиеся сообщения уже очищены обоими, диалог больше не нужен
    if (updated.clearedA >= updated.lastMessageId && updated.clearedB >= updated.lastMessageId) {
      await this.purge(updated.id)
    }
  }

  /** Пересылка: копия сообщения в диалогах с каждым получателем. Файлы не копируются, а становятся общими. */
  async forward(me: number, id: number, to: number[]) {
    const { message } = await this.findVisible(me, id)
    const recipients = [...new Set(to)].filter((userId) => userId !== me)
    if (recipients.length === 0) throw createGraphQLError('Выберите, кому переслать')
    if (recipients.length > MAX_FORWARD_RECIPIENTS) {
      throw createGraphQLError(`Можно переслать не больше чем ${MAX_FORWARD_RECIPIENTS} получателям сразу`)
    }
    const existing = await User.findMany({ where: { id: { in: recipients } }, select: { id: true } })
    if (existing.length !== recipients.length) throw createGraphQLError('Пользователь не найден')

    // Автор оригинала: при пересылке пересланного сохраняется самый первый автор
    let fwdUserId = message.fwdUserId
    let fwdLogin = message.fwdLogin
    if (!fwdUserId) {
      const author = await User.findUnique({ where: { id: message.senderId }, select: { id: true, login: true } })
      fwdUserId = author?.id ?? message.senderId
      fwdLogin = author?.login ?? ''
    }

    const sent = []
    for (const recipient of recipients) {
      sent.push(
        await this.persist(me, recipient, {
          text: message.text,
          attachments: message.attachments,
          fwdUserId,
          fwdLogin,
        }),
      )
    }
    return sent
  }

  /** Чистит список id: уникальные, по возрастанию (порядок переписки), не больше MAX_SELECTION. */
  private normalizeIds(ids: number[]) {
    const unique = [...new Set(ids)].sort((x, y) => x - y)
    if (unique.length === 0) throw createGraphQLError('Выберите сообщения')
    if (unique.length > MAX_SELECTION) throw createGraphQLError(`Можно выбрать не больше ${MAX_SELECTION} сообщений`)
    return unique
  }

  /** Удаление нескольких сообщений. Для «у всех» сначала проверяем, что все свои: либо удаляется всё, либо ничего. */
  async deleteMessages(me: number, ids: number[], forEveryone: boolean) {
    const list = this.normalizeIds(ids)
    const found = await Promise.all(list.map((id) => this.findVisible(me, id)))
    if (forEveryone && found.some(({ message }) => message.senderId !== me)) {
      throw createGraphQLError('Удалить у всех можно только свои сообщения')
    }
    for (const [index, id] of list.entries()) {
      try {
        await this.deleteMessage(me, id, forEveryone)
      } catch (error) {
        // Диалог мог стереться целиком на предыдущем сообщении (удалили последнее): остальные уже не существуют
        if (index === 0) throw error
      }
    }
    return true
  }

  /** Пересылка нескольких сообщений: в порядке переписки, каждому получателю. */
  async forwardMany(me: number, ids: number[], to: number[]) {
    const list = this.normalizeIds(ids)
    // Проверяем доступ ко всем заранее, чтобы не переслать половину
    await Promise.all(list.map((id) => this.findVisible(me, id)))
    const sent = []
    for (const id of list) sent.push(...(await this.forward(me, id, to)))
    return sent
  }

  /** Закрепляет (pinned) или открепляет сообщение. В диалоге одно закреплённое сообщение, видно обоим. */
  async pin(me: number, id: number, pinned: boolean) {
    const { conv } = await this.findVisible(me, id)
    let ids = conv.pinnedIds
    if (pinned && !ids.includes(id)) {
      if (ids.length >= MAX_PINNED) throw createGraphQLError(`Можно закрепить не больше ${MAX_PINNED} сообщений`)
      ids = [...ids, id]
    } else if (!pinned) {
      ids = ids.filter((x) => x !== id)
    }
    await Conversation.update({ where: { id: conv.id }, data: { pinnedIds: ids } })
    io.to(room(conv.userAId))
      .to(room(conv.userBId))
      .emit('messagePinned', { userA: conv.userAId, userB: conv.userBId, pinnedIds: ids })
    return true
  }

  /** Закреплённые сообщения диалога, которые пользователь видит. Порядок закрепления: новые последними. */
  async getPinned(me: number, other: number) {
    const [a, b] = pair(me, other)
    const conv = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conv || conv.pinnedIds.length === 0) return []
    const cleared = me === a ? conv.clearedA : conv.clearedB
    const messages = await Message.findMany({
      where: {
        // Закреплённое должно быть среди видимых: не очищено и не скрыто пользователем
        id: { in: conv.pinnedIds, gt: cleared },
        conversationId: conv.id,
        NOT: { hiddenBy: { has: me } },
      },
      include: messageInclude,
    })
    const order = new Map(conv.pinnedIds.map((id, index) => [id, index]))
    messages.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0))
    return await this.withReplies(
      messages.map((m) => toMessage(m, a, b)),
      { me, cleared },
    )
  }

  // ---------- присутствие ----------

  /** В сети ли пользователь (есть открытые сокеты) и когда был в последний раз. */
  async presence(userId: number) {
    const user = await User.findUnique({ where: { id: userId }, select: { lastSeenAt: true } })
    if (!user) throw createGraphQLError('Пользователь не найден')
    return { online: isOnline(userId), lastSeenAt: user.lastSeenAt }
  }

  // ---------- диалог целиком ----------

  /**
   * «Удалить диалог у себя»: история скрывается только для вызвавшего.
   * Когда очистили оба, переписка и файлы удаляются окончательно.
   */
  async remove(me: number, other: number, forEveryone = false) {
    const [a, b] = pair(me, other)
    const conversation = await Conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
    if (!conversation) return true

    // «У всех»: переписка и файлы стираются у обоих. Это может сделать любой из участников
    if (forEveryone) {
      await this.purge(conversation.id)
      io.to(room(me)).to(room(other)).emit('conversationDeleted', { userA: a, userB: b })
      return true
    }

    const updated = await Conversation.update({
      where: { id: conversation.id },
      data: me === a ? { clearedA: conversation.lastMessageId } : { clearedB: conversation.lastMessageId },
    })
    if (updated.clearedA >= updated.lastMessageId && updated.clearedB >= updated.lastMessageId) {
      await this.purge(updated.id)
    }
    // Остальные вкладки вызвавшего тоже убирают диалог; собеседник ничего не замечает
    io.to(room(me)).emit('conversationDeleted', { userA: a, userB: b })
    return true
  }

  private async purge(conversationId: number) {
    const attachments = await prisma.attachment.findMany({ where: { message: { conversationId } } })
    // Сообщения и вложения в БД удаляются каскадом вместе с диалогом
    await Conversation.delete({ where: { id: conversationId } })
    // Файлы удаляем только если на них не ссылаются сообщения из других диалогов (после пересылки)
    await this.releaseFiles(attachments)
  }
}

export default new MessageController()

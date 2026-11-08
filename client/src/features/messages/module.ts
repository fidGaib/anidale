import { create } from 'zustand'

import { RefreshStore } from '@/app/providers/routes/model'
import { client } from '@/app/providers/apollo-client'
import {
  CONVERSATIONS,
  DELETE_CONVERSATION,
  DELETE_MESSAGE,
  EDIT_MESSAGE,
  FORWARD_MESSAGE,
  MARK_READ,
  MESSAGES,
  PINNED_MESSAGE,
  PIN_MESSAGE,
  PROFILE,
  SEND_MESSAGE,
} from '@/shared/graphql/schema'
import { compressKeepFormat } from '@/shared/lib/image'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { toTimestamp } from '@/shared/lib/time'

export const PAGE_SIZE = 30
export const MAX_ATTACHMENTS = 10
export const MAX_FILE_SIZE = 25 * 1024 * 1024
/** Суммарный размер вложений одного сообщения. */
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024
export const MAX_TEXT_LENGTH = 2000

export interface Attachment {
  id: number
  kind: 'image' | 'audio' | 'file'
  name: string
  size: number
  /** image: путь без расширения (.webp добавляет интерфейс); audio/file: путь файла. */
  file: string
  thumb: string
}

export interface ChatMessage {
  id: number
  text: string
  /** Миллисекунды. */
  date: number
  senderId: number
  recipientId: number
  /** Когда сообщение редактировали (мс); 0 — не редактировалось. */
  editedAt: number
  /** Логин и id автора оригинала у пересланного сообщения; пустая строка / 0, если не пересланное. */
  forwardedFrom: string
  forwardedFromId: number
  /** Id сообщения, на которое это ответ; 0 — не ответ. */
  replyToId: number
  /** Краткое содержимое оригинала; null, если это не ответ или оригинал удалён/недоступен. */
  replyTo: ReplyPreview | null
  attachments: Attachment[]
}

export interface ReplyPreview {
  id: number
  senderId: number
  text: string
  attachmentKind: string | null
  attachmentName: string | null
}

export interface ChatUser {
  id: number
  login: string
  avatar: string
}

export interface ConversationItem {
  user: ChatUser
  lastMessage: ChatMessage | null
  unread: number
}

interface RawMessage {
  id?: number | null
  text?: string | null
  date?: unknown
  senderId?: number | null
  recipientId?: number | null
  editedAt?: unknown
  forwardedFrom?: string | null
  forwardedFromId?: number | null
  replyToId?: number | null
  replyTo?: {
    id?: number | null
    senderId?: number | null
    text?: string | null
    attachmentKind?: string | null
    attachmentName?: string | null
  } | null
  attachments?: Array<{
    id?: number | null
    kind?: string | null
    name?: string | null
    size?: number | null
    file?: string | null
    thumb?: string | null
  } | null> | null
}

/** Приводит сообщение с сервера (GraphQL или сокет) к виду для интерфейса. */
export const toMessage = (m: RawMessage): ChatMessage => ({
  id: m.id ?? 0,
  text: m.text ?? '',
  date: toTimestamp(m.date),
  senderId: m.senderId ?? 0,
  recipientId: m.recipientId ?? 0,
  editedAt: toTimestamp(m.editedAt),
  forwardedFrom: m.forwardedFrom ?? '',
  forwardedFromId: m.forwardedFromId ?? 0,
  replyToId: m.replyToId ?? 0,
  replyTo: m.replyTo
    ? {
        id: m.replyTo.id ?? 0,
        senderId: m.replyTo.senderId ?? 0,
        text: m.replyTo.text ?? '',
        attachmentKind: m.replyTo.attachmentKind ?? null,
        attachmentName: m.replyTo.attachmentName ?? null,
      }
    : null,
  attachments: (m.attachments ?? []).flatMap((a) =>
    a
      ? [
          {
            id: a.id ?? 0,
            kind: a.kind === 'image' || a.kind === 'audio' ? a.kind : 'file',
            name: a.name ?? 'file',
            size: a.size ?? 0,
            file: a.file ?? '',
            thumb: a.thumb ?? '',
          } as Attachment,
        ]
      : [],
  ),
})

const errorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return 'Что-то пошло не так'
  // Сервер или nginx отклонили слишком большой запрос: Apollo показывает это сухой фразой про статус
  if (error.message.includes('status code 413')) return 'Файлы слишком большие. Всего можно отправить до 100 МБ за раз'
  return error.message
}

interface MessagesStore {
  conversations: ConversationItem[]
  conversationsLoading: boolean
  /** Собеседник открытого чата и сообщения от старых к новым. */
  activeUserId: number | null
  activeUser: ChatUser | null
  messages: ChatMessage[]
  hasMore: boolean
  loading: boolean
  sending: boolean
  /** Процент отправленных на сервер байт, пока уходит сообщение с файлами; иначе null. */
  uploadProgress: number | null
  error: string
  /** Закреплённое сообщение открытого чата. */
  pinned: ChatMessage | null
  /** Сообщение, которое сейчас редактируется в поле ввода. */
  editing: ChatMessage | null
  /** Сообщение, на которое пользователь сейчас отвечает. */
  replying: ChatMessage | null
  /** Короткое сообщение об успехе («Сообщение переслано»); гаснет само. */
  notice: string
  loadConversations: () => Promise<void>
  openChat: (userId: number) => Promise<void>
  closeChat: () => void
  loadOlder: () => Promise<void>
  /** Возвращает true, если сообщение отправлено (интерфейс очищает поле ввода). */
  send: (text: string, files: File[]) => Promise<boolean>
  /** forEveryone: стереть переписку и файлы у обоих; иначе диалог пропадает только у вас. */
  removeConversation: (userId: number, forEveryone?: boolean) => Promise<boolean>
  /** Убирает диалог из памяти (после удаления, в том числе собеседником у всех). */
  drop: (userId: number) => void
  /** Новое сообщение (с сокета или из ответа на отправку). */
  receive: (message: ChatMessage, myId: number) => void
  startEdit: (message: ChatMessage | null) => void
  /** Режим ответа: следующее отправленное сообщение станет ответом на это. null — отменить. */
  startReply: (message: ChatMessage | null) => void
  editMessage: (id: number, text: string) => Promise<boolean>
  /** forEveryone: стереть у обоих (только своё); иначе скрыть у себя. */
  deleteMessage: (id: number, forEveryone: boolean) => Promise<boolean>
  forwardMessage: (id: number, to: number[]) => Promise<boolean>
  pinMessage: (id: number, pinned: boolean) => Promise<boolean>
  /** События с сокета: сообщение изменено / удалено / закреплено (в том числе собеседником). */
  applyUpdated: (message: ChatMessage) => void
  applyDeleted: (event: { userA: number; userB: number; ids: number[] }, myId: number) => void
  applyPinned: (event: { userA: number; userB: number; pinnedMessageId: number | null }, myId: number) => void
  reset: () => void
}

// Номер текущего открытия чата: ответы устаревших запросов игнорируются
let chatToken = 0

export const useMessagesStore = create<MessagesStore>()((set, get) => {
  const markRead = async (userId: number) => {
    set((state) => ({
      conversations: state.conversations.map((c) => (c.user.id === userId ? { ...c, unread: 0 } : c)),
    }))
    try {
      await client.mutate({ mutation: MARK_READ, variables: { userId } })
    } catch {
      // Не критично: при следующем открытии отметится снова
    }
  }

  return {
    conversations: [],
    conversationsLoading: false,
    activeUserId: null,
    activeUser: null,
    messages: [],
    hasMore: false,
    loading: false,
    sending: false,
    uploadProgress: null,
    error: '',
    pinned: null,
    editing: null,
    replying: null,
    notice: '',

    loadConversations: async () => {
      if (!RefreshStore.getState().refreshData.id) return
      set({ conversationsLoading: true })
      try {
        const { data } = await client.query({ query: CONVERSATIONS, fetchPolicy: 'network-only' })
        const conversations: ConversationItem[] = (data.getConversations ?? []).map((c) => ({
          user: { id: c.user.id ?? 0, login: c.user.login ?? '', avatar: c.user.avatar ?? '' },
          lastMessage: c.lastMessage ? toMessage(c.lastMessage) : null,
          // Открытый чат уже прочитан
          unread: c.user.id === get().activeUserId ? 0 : c.unread,
        }))
        set({ conversations })
      } catch (error) {
        set({ error: errorMessage(error) })
      } finally {
        set({ conversationsLoading: false })
      }
    },

    openChat: async (userId) => {
      const token = ++chatToken
      const known = get().conversations.find((c) => c.user.id === userId)?.user ?? null
      set({
        activeUserId: userId,
        activeUser: known,
        messages: [],
        hasMore: false,
        loading: true,
        error: '',
        pinned: null,
        editing: null,
        replying: null,
        notice: '',
      })
      try {
        const [{ data }, profile, pinnedResult] = await Promise.all([
          client.query({
            query: MESSAGES,
            variables: { userId, limit: PAGE_SIZE },
            fetchPolicy: 'network-only',
          }),
          // Диалога может ещё не быть (первое сообщение): данные собеседника берём из профиля
          known
            ? Promise.resolve(null)
            : client.query({ query: PROFILE, variables: { id: userId }, fetchPolicy: 'network-only' }),
          // Закреплённое сообщение: если не загрузилось, чат всё равно открывается
          client
            .query({ query: PINNED_MESSAGE, variables: { userId }, fetchPolicy: 'network-only' })
            .catch(() => null),
        ])
        if (token !== chatToken) return
        const fetched = (data.getMessages ?? []).map(toMessage)
        const pinned = pinnedResult?.data.getPinnedMessage
        set({
          // С сервера приходит «новые сверху», в чате нужен порядок «старые сверху»
          messages: [...fetched].reverse(),
          hasMore: fetched.length === PAGE_SIZE,
          pinned: pinned ? toMessage(pinned) : null,
          activeUser: known ?? {
            id: userId,
            login: profile?.data.getUser?.login ?? '',
            avatar: profile?.data.getUser?.avatar ?? '',
          },
        })
        if (get().conversations.find((c) => c.user.id === userId)?.unread) void markRead(userId)
      } catch (error) {
        if (token === chatToken) set({ error: errorMessage(error) })
      } finally {
        if (token === chatToken) set({ loading: false })
      }
    },

    closeChat: () => {
      chatToken++
      set({
        activeUserId: null,
        activeUser: null,
        messages: [],
        hasMore: false,
        loading: false,
        error: '',
        pinned: null,
        editing: null,
        replying: null,
        notice: '',
      })
    },

    loadOlder: async () => {
      const { activeUserId, messages, hasMore, loading } = get()
      if (activeUserId === null || !hasMore || loading || messages.length === 0) return
      const token = chatToken
      set({ loading: true })
      try {
        const { data } = await client.query({
          query: MESSAGES,
          variables: { userId: activeUserId, beforeId: messages[0].id, limit: PAGE_SIZE },
          fetchPolicy: 'network-only',
        })
        if (token !== chatToken) return
        const older = (data.getMessages ?? []).map(toMessage).reverse()
        set((state) => {
          const ids = new Set(state.messages.map((m) => m.id))
          return {
            messages: [...older.filter((m) => !ids.has(m.id)), ...state.messages],
            hasMore: older.length === PAGE_SIZE,
          }
        })
      } catch (error) {
        if (token === chatToken) set({ error: errorMessage(error) })
      } finally {
        if (token === chatToken) set({ loading: false })
      }
    },

    send: async (text, files) => {
      const { activeUserId, sending } = get()
      if (activeUserId === null || sending) return false
      set({ sending: true, error: '' })
      try {
        // Картинки сжимаем в браузере без смены формата: меньше трафика и проще уложиться в лимит 5 МБ
        const prepared = await Promise.all(files.map((file) => compressKeepFormat(file)))
        // Прогресс нужен только когда есть что загружать
        if (prepared.length) set({ uploadProgress: 0 })
        const { data } = await client.mutate({
          mutation: SEND_MESSAGE,
          variables: {
            to: activeUserId,
            text: text.trim() || null,
            files: prepared.length ? prepared : null,
            replyTo: get().replying?.id ?? null,
          },
          context: prepared.length
            ? { fetchOptions: { onProgress: (event: UploadProgressEvent) => set({ uploadProgress: toPercent(event) }) } }
            : undefined,
        })
        if (data?.sendMessage) {
          const myId = RefreshStore.getState().refreshData.id ?? 0
          get().receive(toMessage(data.sendMessage), myId)
        }
        set({ replying: null })
        return true
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      } finally {
        set({ sending: false, uploadProgress: null })
      }
    },

    removeConversation: async (userId, forEveryone = false) => {
      try {
        await client.mutate({ mutation: DELETE_CONVERSATION, variables: { userId, forEveryone } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      get().drop(userId)
      return true
    },

    drop: (userId) => {
      set((state) => ({
        conversations: state.conversations.filter((c) => c.user.id !== userId),
        ...(state.activeUserId === userId ? { messages: [], hasMore: false } : {}),
      }))
    },

    receive: (message, myId) => {
      const otherId = message.senderId === myId ? message.recipientId : message.senderId
      const incoming = message.senderId !== myId
      const isActive = get().activeUserId === otherId

      if (isActive) {
        set((state) =>
          state.messages.some((m) => m.id === message.id) ? state : { messages: [...state.messages, message] },
        )
        if (incoming) void markRead(otherId)
      }

      const existing = get().conversations.find((c) => c.user.id === otherId)
      if (!existing) {
        // Новый для нас диалог: данные собеседника подтянет список
        void get().loadConversations()
        return
      }
      // Это же сообщение уже учтено (пришло и в ответе на отправку, и по сокету)
      if (existing.lastMessage?.id === message.id) return
      set((state) => ({
        conversations: [
          { ...existing, lastMessage: message, unread: incoming && !isActive ? existing.unread + 1 : 0 },
          ...state.conversations.filter((c) => c.user.id !== otherId),
        ],
      }))
    },

    startEdit: (message) => set({ editing: message, ...(message ? { replying: null } : {}) }),

    startReply: (message) => set({ replying: message, ...(message ? { editing: null } : {}) }),

    editMessage: async (id, text) => {
      set({ error: '' })
      try {
        const { data } = await client.mutate({ mutation: EDIT_MESSAGE, variables: { id, text } })
        if (data?.editMessage) get().applyUpdated(toMessage(data.editMessage))
        set({ editing: null })
        return true
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
    },

    deleteMessage: async (id, forEveryone) => {
      set({ error: '' })
      try {
        await client.mutate({ mutation: DELETE_MESSAGE, variables: { id, forEveryone } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      // Убираем сразу, не дожидаясь события с сокета
      const { activeUserId } = get()
      const myId = RefreshStore.getState().refreshData.id ?? 0
      if (activeUserId !== null) {
        get().applyDeleted({ userA: Math.min(myId, activeUserId), userB: Math.max(myId, activeUserId), ids: [id] }, myId)
      }
      return true
    },

    forwardMessage: async (id, to) => {
      set({ error: '' })
      try {
        await client.mutate({ mutation: FORWARD_MESSAGE, variables: { id, to } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      // Копии придут по сокету как обычные новые сообщения
      set({ notice: to.length > 1 ? `Переслано: ${to.length} получателям` : 'Сообщение переслано' })
      setTimeout(() => set({ notice: '' }), 3000)
      return true
    },

    pinMessage: async (id, pinned) => {
      set({ error: '' })
      try {
        await client.mutate({ mutation: PIN_MESSAGE, variables: { id, pinned } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      set((state) => ({ pinned: pinned ? (state.messages.find((m) => m.id === id) ?? state.pinned) : null }))
      return true
    },

    applyUpdated: (message) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id === message.id) return message
          // Цитата в ответах на это сообщение показывает новый текст
          return m.replyTo?.id === message.id ? { ...m, replyTo: { ...m.replyTo, text: message.text.slice(0, 200) } } : m
        }),
        pinned: state.pinned?.id === message.id ? message : state.pinned,
        editing: state.editing?.id === message.id ? null : state.editing,
        conversations: state.conversations.map((c) =>
          c.lastMessage?.id === message.id ? { ...c, lastMessage: message } : c,
        ),
      }))
    },

    applyDeleted: ({ userA, userB, ids }, myId) => {
      const other = userA === myId ? userB : userA
      const gone = new Set(ids)
      if (get().activeUserId === other) {
        set((state) => ({
          messages: state.messages
            .filter((m) => !gone.has(m.id))
            // Ответы на удалённое сообщение сразу показывают «Сообщение удалено» вместо старой цитаты
            .map((m) => (m.replyTo && gone.has(m.replyTo.id) ? { ...m, replyTo: null } : m)),
          pinned: state.pinned && gone.has(state.pinned.id) ? null : state.pinned,
          editing: state.editing && gone.has(state.editing.id) ? null : state.editing,
          replying: state.replying && gone.has(state.replying.id) ? null : state.replying,
        }))
      }
      // Превью в списке диалогов и счётчики пересчитает сервер
      void get().loadConversations()
    },

    applyPinned: async ({ userA, userB, pinnedMessageId }, myId) => {
      const other = userA === myId ? userB : userA
      if (get().activeUserId !== other) return
      if (pinnedMessageId === null) {
        set({ pinned: null })
        return
      }
      const loaded = get().messages.find((m) => m.id === pinnedMessageId)
      if (loaded) {
        set({ pinned: loaded })
        return
      }
      // Закреплено сообщение, которого нет в загруженной части истории
      try {
        const { data } = await client.query({
          query: PINNED_MESSAGE,
          variables: { userId: other },
          fetchPolicy: 'network-only',
        })
        if (get().activeUserId === other) {
          set({ pinned: data.getPinnedMessage ? toMessage(data.getPinnedMessage) : null })
        }
      } catch {
        // Не критично: полоска появится при следующем открытии чата
      }
    },

    reset: () => {
      chatToken++
      set({
        pinned: null,
        editing: null,
        replying: null,
        notice: '',
        conversations: [],
        conversationsLoading: false,
        activeUserId: null,
        activeUser: null,
        messages: [],
        hasMore: false,
        loading: false,
        sending: false,
        uploadProgress: null,
        error: '',
      })
    },
  }
})

// Выход или смена пользователя: переписка прошлого пользователя не должна оставаться в памяти
const unsubscribeSession = RefreshStore.subscribe((state, prev) => {
  const prevId = prev.refreshData.id
  if (prevId && state.refreshData.id !== prevId) useMessagesStore.getState().reset()
})
import.meta.hot?.dispose(unsubscribeSession)

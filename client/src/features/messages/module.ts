import { create } from 'zustand'

import { client } from '@/app/providers/apollo-client'
import { RefreshStore } from '@/app/providers/routes/model'
import {
  CONVERSATIONS,
  CONVERSATION_SETTINGS,
  DELETE_CONVERSATION,
  DELETE_MESSAGE,
  DELETE_MESSAGES,
  EDIT_MESSAGE,
  FORWARD_MESSAGE,
  FORWARD_MESSAGES,
  MARK_READ,
  MESSAGES,
  PEER_READ,
  PINNED_MESSAGES,
  PIN_MESSAGE,
  PRESENCE,
  PROFILE,
  REACT_MESSAGE,
  SEND_MESSAGE,
} from '@/shared/graphql/schema'
import { compressKeepFormat } from '@/shared/lib/image'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { toTimestamp } from '@/shared/lib/time'

import {
  ChatMessage,
  ChatUser,
  ConversationItem,
  MAX_SELECTION,
  PAGE_SIZE,
  Presence,
  Reaction,
  toMessage,
} from './types'

// Типы и константы переэкспортируются, чтобы остальные файлы могли по-прежнему брать их из './module'
export * from './types'

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
  pinnedList: ChatMessage[]
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
  /** Режим выбора: id выбранных сообщений; null — режим выключен. */
  selection: number[] | null
  /** Включает режим выбора (с первым выбранным сообщением) или переключает выбор сообщения. */
  toggleSelect: (id: number) => void
  clearSelection: () => void
  deleteMessages: (ids: number[], forEveryone: boolean) => Promise<boolean>
  forwardMessages: (ids: number[], to: number[]) => Promise<boolean>
  /** События с сокета: сообщение изменено / удалено / закреплено (в том числе собеседником). */
  applyUpdated: (message: ChatMessage) => void
  applyDeleted: (event: { userA: number; userB: number; ids: number[] }, myId: number) => void
  applyPinned: (event: { userA: number; userB: number; pinnedIds: number[] }, myId: number) => void
  /** Поставить реакцию (повтор той же снимает). */
  react: (id: number, emoji: string | null) => Promise<void>
  applyReactions: (event: { userA: number; userB: number; id: number; reactions: Reaction[] }, myId: number) => void
  /** Первое непрочитанное сообщение при открытии чата (для плашки «Непрочитанные»); 0 — нет. */
  firstUnreadId: number
  /** Показана часть истории вокруг найденного сообщения: свежих сообщений в списке нет. */
  detached: boolean
  /** Новых сообщений пришло, пока список «отсоединён» от конца. */
  missedWhileDetached: number
  /** Показать сообщение: если оно не загружено, подгружается кусок истории вокруг него. */
  jumpTo: (id: number) => Promise<boolean>
  /** Вернуться к последним сообщениям. */
  backToLatest: () => Promise<void>
  peerPresence: Presence | null
  applyPresence: (event: { userId: number; online: boolean; lastSeenAt: unknown }) => void
  /** Настройки диалога у меня (сразу в списке, затем на сервере). */
  setSettings: (userId: number, patch: { muted?: boolean; archived?: boolean; pinned?: boolean }) => Promise<void>
  /** Id последнего моего сообщения, которое собеседник уже прочитал (галочки «прочитано»). */
  peerRead: number
  /** Собеседник открытого чата сейчас печатает. */
  peerTyping: boolean
  applyRead: (event: { reader: number; upTo: number }) => void
  applyTyping: (from: number) => void
  reset: () => void
}

let typingTimer: ReturnType<typeof setTimeout> | undefined

/** Закреплённые диалоги сверху, внутри групп — свежие выше. */
const sortConversations = (list: ConversationItem[]) =>
  [...list].sort(
    (x, y) => Number(y.pinned) - Number(x.pinned) || (y.lastMessage?.date ?? 0) - (x.lastMessage?.date ?? 0),
  )

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
    pinnedList: [],
    firstUnreadId: 0,
    detached: false,
    missedWhileDetached: 0,
    peerPresence: null,
    editing: null,
    replying: null,
    notice: '',
    peerRead: 0,
    peerTyping: false,
    selection: null,

    toggleSelect: (id) => {
      const current = get().selection
      if (current === null) return set({ selection: [id] })
      if (current.includes(id)) {
        const next = current.filter((x) => x !== id)
        // Сняли последнее выделение: выходим из режима выбора
        return set({ selection: next.length ? next : null })
      }
      if (current.length >= MAX_SELECTION) {
        set({ error: `Можно выбрать не больше ${MAX_SELECTION} сообщений` })
        return
      }
      set({ selection: [...current, id] })
    },

    clearSelection: () => set({ selection: null }),

    deleteMessages: async (ids, forEveryone) => {
      set({ error: '' })
      try {
        await client.mutate({ mutation: DELETE_MESSAGES, variables: { ids, forEveryone } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      const { activeUserId } = get()
      const myId = RefreshStore.getState().refreshData.id ?? 0
      if (activeUserId !== null) {
        get().applyDeleted({ userA: Math.min(myId, activeUserId), userB: Math.max(myId, activeUserId), ids }, myId)
      }
      set({ selection: null })
      return true
    },

    forwardMessages: async (ids, to) => {
      set({ error: '' })
      try {
        await client.mutate({ mutation: FORWARD_MESSAGES, variables: { ids, to } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return false
      }
      set({
        selection: null,
        notice: to.length > 1 ? `Переслано: ${to.length} получателям` : 'Сообщения пересланы',
      })
      setTimeout(() => set({ notice: '' }), 3000)
      return true
    },

    applyRead: ({ reader, upTo }) => {
      if (get().activeUserId !== reader) return
      set((state) => ({ peerRead: Math.max(state.peerRead, upTo) }))
    },

    applyTyping: (from) => {
      if (get().activeUserId !== from) return
      set({ peerTyping: true })
      clearTimeout(typingTimer)
      // Событие шлётся пока человек печатает; если затихло — индикатор гаснет
      typingTimer = setTimeout(() => set({ peerTyping: false }), 4000)
    },

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
          muted: c.muted,
          archived: c.archived,
          pinned: c.pinned,
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
      clearTimeout(typingTimer)
      set({
        peerRead: 0,
        peerTyping: false,
        selection: null,
        activeUserId: userId,
        activeUser: known,
        messages: [],
        hasMore: false,
        loading: true,
        error: '',
        pinnedList: [],
        firstUnreadId: 0,
        detached: false,
        missedWhileDetached: 0,
        peerPresence: null,
        editing: null,
        replying: null,
        notice: '',
      })
      try {
        const [{ data }, profile, pinnedResult, readResult, presenceResult] = await Promise.all([
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
            .query({ query: PINNED_MESSAGES, variables: { userId }, fetchPolicy: 'network-only' })
            .catch(() => null),
          client.query({ query: PEER_READ, variables: { userId }, fetchPolicy: 'network-only' }).catch(() => null),
          client.query({ query: PRESENCE, variables: { userId }, fetchPolicy: 'network-only' }).catch(() => null),
        ])
        if (token !== chatToken) return
        const fetched = (data.getMessages ?? []).map(toMessage)
        const pinnedMessages = (pinnedResult?.data.getPinnedMessages ?? []).map(toMessage)
        const presence = presenceResult?.data.getPresence
        // Первое непрочитанное: сколько чужих сообщений не прочитано, столько последних чужих и есть новые
        const unreadCount = get().conversations.find((c) => c.user.id === userId)?.unread ?? 0
        const incomingMessages = [...fetched].reverse().filter((m) => m.senderId === userId)
        const firstUnread =
          unreadCount > 0 && unreadCount <= incomingMessages.length
            ? incomingMessages[incomingMessages.length - unreadCount].id
            : 0
        set({
          peerRead: Math.max(get().peerRead, readResult?.data.getPeerRead ?? 0),
          // С сервера приходит «новые сверху», в чате нужен порядок «старые сверху»
          messages: [...fetched].reverse(),
          hasMore: fetched.length === PAGE_SIZE,
          pinnedList: pinnedMessages,
          firstUnreadId: firstUnread,
          peerPresence: presence ? { online: presence.online, lastSeenAt: toTimestamp(presence.lastSeenAt) } : null,
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
      clearTimeout(typingTimer)
      set({
        peerRead: 0,
        peerTyping: false,
        selection: null,
        activeUserId: null,
        activeUser: null,
        messages: [],
        hasMore: false,
        loading: false,
        error: '',
        pinnedList: [],
        firstUnreadId: 0,
        detached: false,
        missedWhileDetached: 0,
        peerPresence: null,
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
            ? {
                fetchOptions: { onProgress: (event: UploadProgressEvent) => set({ uploadProgress: toPercent(event) }) },
              }
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

      if (isActive && get().detached) {
        // Показан кусок старой истории: свежее сообщение в него не вставляем, иначе будет дыра
        if (incoming) set((state) => ({ missedWhileDetached: state.missedWhileDetached + 1, peerTyping: false }))
        // Своё сообщение: возвращаемся к концу переписки
        else void get().backToLatest()
      } else if (isActive) {
        if (incoming) set({ peerTyping: false })
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
        conversations: sortConversations([
          {
            ...existing,
            lastMessage: message,
            unread: incoming && !isActive ? existing.unread + 1 : 0,
            // Новое сообщение возвращает диалог из архива, если он не заглушён
            archived: existing.muted ? existing.archived : false,
          },
          ...state.conversations.filter((c) => c.user.id !== otherId),
        ]),
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
        get().applyDeleted(
          { userA: Math.min(myId, activeUserId), userB: Math.max(myId, activeUserId), ids: [id] },
          myId,
        )
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
      // Новый закреп встаёт в конец списка; список целиком придёт и по сокету
      set((state) => {
        if (!pinned) return { pinnedList: state.pinnedList.filter((m) => m.id !== id) }
        const message = state.messages.find((m) => m.id === id)
        return message && !state.pinnedList.some((m) => m.id === id)
          ? { pinnedList: [...state.pinnedList, message] }
          : {}
      })
      return true
    },

    react: async (id, emoji) => {
      const myId = RefreshStore.getState().refreshData.id ?? 0
      const activeUserId = get().activeUserId
      if (activeUserId === null) return
      const message = get().messages.find((m) => m.id === id)
      const current = message?.reactions.find((r) => r.userId === myId)?.emoji
      // Сразу показываем результат: повтор той же реакции снимает её
      const next = !emoji || current === emoji ? null : emoji
      const withMine = (reactions: Reaction[]): Reaction[] => [
        ...reactions.filter((r) => r.userId !== myId),
        ...(next ? [{ userId: myId, emoji: next }] : []),
      ]
      get().applyReactions(
        {
          userA: Math.min(myId, activeUserId),
          userB: Math.max(myId, activeUserId),
          id,
          reactions: withMine(message?.reactions ?? []),
        },
        myId,
      )
      try {
        const { data } = await client.mutate({ mutation: REACT_MESSAGE, variables: { id, emoji: next } })
        if (data?.reactMessage) {
          get().applyReactions(
            {
              userA: Math.min(myId, activeUserId),
              userB: Math.max(myId, activeUserId),
              id,
              reactions: toMessage({ reactions: data.reactMessage.reactions }).reactions,
            },
            myId,
          )
        }
      } catch (error) {
        // Откатываем показанное заранее
        get().applyReactions(
          {
            userA: Math.min(myId, activeUserId),
            userB: Math.max(myId, activeUserId),
            id,
            reactions: message?.reactions ?? [],
          },
          myId,
        )
        set({ error: errorMessage(error) })
      }
    },

    applyReactions: ({ userA, userB, id, reactions }, myId) => {
      const other = userA === myId ? userB : userA
      if (get().activeUserId !== other) return
      const update = (m: ChatMessage) => (m.id === id ? { ...m, reactions } : m)
      set((state) => ({ messages: state.messages.map(update), pinnedList: state.pinnedList.map(update) }))
    },

    applyPresence: ({ userId, online, lastSeenAt }) => {
      if (get().activeUserId !== userId) return
      set({ peerPresence: { online, lastSeenAt: toTimestamp(lastSeenAt) } })
    },

    setSettings: async (userId, patch) => {
      const previous = get().conversations
      set({ conversations: sortConversations(previous.map((c) => (c.user.id === userId ? { ...c, ...patch } : c))) })
      try {
        await client.mutate({ mutation: CONVERSATION_SETTINGS, variables: { userId, ...patch } })
      } catch (error) {
        set({ conversations: previous, error: errorMessage(error) })
      }
    },

    jumpTo: async (id) => {
      if (get().messages.some((m) => m.id === id)) return true
      const userId = get().activeUserId
      if (userId === null) return false
      const token = chatToken
      try {
        // Окно истории, заканчивающееся найденным сообщением: сервер отдаёт «новые сверху» перед beforeId
        const { data } = await client.query({
          query: MESSAGES,
          variables: { userId, beforeId: id + 1, limit: PAGE_SIZE },
          fetchPolicy: 'network-only',
        })
        if (token !== chatToken) return false
        const fetched = (data.getMessages ?? []).map(toMessage)
        if (!fetched.some((m) => m.id === id)) return false
        const lastLoaded = get().messages[get().messages.length - 1]?.id ?? 0
        set({
          messages: [...fetched].reverse(),
          hasMore: fetched.length === PAGE_SIZE,
          // Если найденное новее всего, что было загружено, значит свежих сообщений в окне нет
          detached: id < lastLoaded || get().detached,
          missedWhileDetached: 0,
        })
        return true
      } catch (error) {
        if (token === chatToken) set({ error: errorMessage(error) })
        return false
      }
    },

    backToLatest: async () => {
      const userId = get().activeUserId
      if (userId !== null) await get().openChat(userId)
    },

    applyUpdated: (message) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id === message.id) return message
          // Цитата в ответах на это сообщение показывает новый текст
          return m.replyTo?.id === message.id
            ? { ...m, replyTo: { ...m.replyTo, text: message.text.slice(0, 200) } }
            : m
        }),
        pinnedList: state.pinnedList.map((m) => (m.id === message.id ? message : m)),
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
          pinnedList: state.pinnedList.filter((m) => !gone.has(m.id)),
          editing: state.editing && gone.has(state.editing.id) ? null : state.editing,
          selection: state.selection?.filter((x) => !gone.has(x)).length
            ? state.selection.filter((x) => !gone.has(x))
            : null,
          replying: state.replying && gone.has(state.replying.id) ? null : state.replying,
        }))
      }
      // Превью в списке диалогов и счётчики пересчитает сервер
      void get().loadConversations()
    },

    applyPinned: async ({ userA, userB, pinnedIds }, myId) => {
      const other = userA === myId ? userB : userA
      if (get().activeUserId !== other) return
      const have = get().pinnedList
      const known = new Map([...have, ...get().messages].map((m) => [m.id, m]))
      // Всё нужное уже загружено: собираем список без запроса
      if (pinnedIds.every((id) => known.has(id))) {
        set({ pinnedList: pinnedIds.flatMap((id) => known.get(id) ?? []) })
        return
      }
      // Закреплено сообщение, которого нет в загруженной части истории
      try {
        const { data } = await client.query({
          query: PINNED_MESSAGES,
          variables: { userId: other },
          fetchPolicy: 'network-only',
        })
        if (get().activeUserId === other) set({ pinnedList: (data.getPinnedMessages ?? []).map(toMessage) })
      } catch {
        // Не критично: полоска появится при следующем открытии чата
      }
    },

    reset: () => {
      chatToken++
      clearTimeout(typingTimer)
      set({
        peerRead: 0,
        peerTyping: false,
        selection: null,
        pinnedList: [],
        firstUnreadId: 0,
        detached: false,
        missedWhileDetached: 0,
        peerPresence: null,
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

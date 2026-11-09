import { create } from 'zustand'

import { client } from '@/app/providers/apollo-client'
import { RefreshStore } from '@/app/providers/routes/model'
import { MARK_NOTIFICATIONS_READ, NOTIFICATIONS, UNREAD_NOTIFICATIONS } from '@/shared/graphql/schema'
import { toTimestamp } from '@/shared/lib/time'

export const PAGE_SIZE = 20
const TOAST_MS = 5000

export type NotificationKind =
  | 'like'
  | 'comment'
  | 'track'
  | 'repost'
  | 'community_request'
  | 'community_accept'
  | 'community_suggest'
  | 'community_invite'

const KINDS: NotificationKind[] = [
  'comment',
  'track',
  'repost',
  'community_request',
  'community_accept',
  'community_suggest',
  'community_invite',
]

/** Уведомления о сообществах: ведут на страницу сообщества. */
export const isCommunityKind = (type: NotificationKind) => type.startsWith('community_')

export interface AppNotification {
  id: number
  type: NotificationKind
  text: string
  /** Миллисекунды. */
  date: number
  read: boolean
  postId: number
  /** Сообщество, о котором уведомление; 0 — не о сообществе. */
  communityId: number
  actor: { id: number; login: string; avatar: string }
}

/** Всплывающее сообщение в углу экрана: новое уведомление или сообщение в чате. */
export interface Toast {
  id: number
  title: string
  text: string
  /** Куда перейти по клику. */
  link: string
  avatar: string
}

interface RawNotification {
  id?: number | null
  type?: string | null
  text?: string | null
  date?: unknown
  read?: boolean | null
  postId?: number | null
  communityId?: number | null
  actor?: { id?: number | null; login?: string | null; avatar?: string | null } | null
}

/** Приводит уведомление с сервера (GraphQL или сокет) к виду для интерфейса. */
export const toNotification = (n: RawNotification): AppNotification => ({
  id: n.id ?? 0,
  type: KINDS.find((kind) => kind === n.type) ?? 'like',
  text: n.text ?? '',
  date: toTimestamp(n.date),
  read: !!n.read,
  postId: n.postId ?? 0,
  communityId: n.communityId ?? 0,
  actor: { id: n.actor?.id ?? 0, login: n.actor?.login ?? '', avatar: n.actor?.avatar ?? '' },
})

interface NotificationsStore {
  items: AppNotification[]
  unread: number
  loading: boolean
  hasMore: boolean
  /** Список уже загружали с сервера (при открытии без этого показываем «Загрузка»). */
  loaded: boolean
  error: string
  toasts: Toast[]
  /** Счётчик непрочитанных (при старте и после входа). */
  loadUnread: () => Promise<void>
  load: () => Promise<void>
  loadMore: () => Promise<void>
  /** Новое уведомление с сокета. */
  receive: (notification: AppNotification) => void
  /** Отметить все прочитанными (на сервере и в списке). */
  markAllRead: () => Promise<void>
  /** Все прочитаны в другой вкладке. */
  applyRead: () => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  reset: () => void
}

let toastSeq = 0

export const useNotificationsStore = create<NotificationsStore>()((set, get) => ({
  items: [],
  unread: 0,
  loading: false,
  hasMore: false,
  loaded: false,
  error: '',
  toasts: [],

  loadUnread: async () => {
    if (!RefreshStore.getState().refreshData.id) return
    try {
      const { data } = await client.query({ query: UNREAD_NOTIFICATIONS, fetchPolicy: 'network-only' })
      set({ unread: data.unreadNotificationsCount })
    } catch {
      // Счётчик не критичен: обновится при открытии списка
    }
  },

  load: async () => {
    if (get().loading) return
    set({ loading: true, error: '' })
    try {
      const { data } = await client.query({
        query: NOTIFICATIONS,
        variables: { limit: PAGE_SIZE },
        fetchPolicy: 'network-only',
      })
      const items = (data.getNotifications ?? []).map(toNotification)
      set({ items, hasMore: items.length === PAGE_SIZE, loaded: true })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Не удалось загрузить уведомления' })
    } finally {
      set({ loading: false })
    }
  },

  loadMore: async () => {
    const { items, hasMore, loading } = get()
    if (!hasMore || loading || items.length === 0) return
    set({ loading: true })
    try {
      const { data } = await client.query({
        query: NOTIFICATIONS,
        variables: { limit: PAGE_SIZE, beforeId: items[items.length - 1].id },
        fetchPolicy: 'network-only',
      })
      const older = (data.getNotifications ?? []).map(toNotification)
      set((state) => {
        const ids = new Set(state.items.map((n) => n.id))
        return { items: [...state.items, ...older.filter((n) => !ids.has(n.id))], hasMore: older.length === PAGE_SIZE }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Не удалось загрузить уведомления' })
    } finally {
      set({ loading: false })
    }
  },

  receive: (notification) => {
    set((state) =>
      state.items.some((n) => n.id === notification.id)
        ? state
        : { items: [notification, ...state.items], unread: state.unread + 1 },
    )
  },

  markAllRead: async () => {
    if (get().unread === 0) return
    try {
      await client.mutate({ mutation: MARK_NOTIFICATIONS_READ })
      set((state) => ({ unread: 0, items: state.items.map((n) => ({ ...n, read: true })) }))
    } catch {
      // Останутся непрочитанными: отметится при следующем открытии
    }
  },

  applyRead: () => set((state) => ({ unread: 0, items: state.items.map((n) => ({ ...n, read: true })) })),

  pushToast: (toast) => {
    const id = ++toastSeq
    // Не больше трёх одновременно: старые вытесняются
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-3) }))
    setTimeout(() => get().dismissToast(id), TOAST_MS)
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  reset: () => set({ items: [], unread: 0, loading: false, hasMore: false, loaded: false, error: '', toasts: [] }),
}))

// Выход или смена пользователя: чужие уведомления не должны оставаться в памяти
const unsubscribeSession = RefreshStore.subscribe((state, prev) => {
  const prevId = prev.refreshData.id
  if (prevId && state.refreshData.id !== prevId) useNotificationsStore.getState().reset()
})
import.meta.hot?.dispose(unsubscribeSession)

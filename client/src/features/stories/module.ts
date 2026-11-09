import { create } from 'zustand'

import { client } from '@/app/providers/apollo-client'
import { RefreshStore } from '@/app/providers/routes/model'
import { COMMUNITY_STORIES, CREATE_STORY, DELETE_STORY, STORIES, VIEW_STORY } from '@/shared/graphql/schema'
import { toTimestamp } from '@/shared/lib/time'

export interface Story {
  id: number
  /** Путь картинки без расширения (.webp добавляет интерфейс): лучшее доступное качество. */
  src: string
  text: string
  date: number
  expiresAt: number
  seen: boolean
  /** Сколько человек посмотрело; только у автора, иначе null. */
  viewsCount: number | null
}

/** Сообщество, истории которого сейчас загружены. */
export interface CommunitySource {
  id: number
  name: string
  avatar: string
  /** Может удалять истории и видит число просмотров. */
  canManage: boolean
}

export interface StoryGroup {
  /** Автор группы. У истории сообщества это само сообщество с отрицательным id, чтобы не пересекаться с людьми. */
  user: { id: number; login: string; avatar: string }
  /** Группа — истории сообщества. */
  community?: { id: number; canManage: boolean }
  stories: Story[]
  allSeen: boolean
}

interface StoriesStore {
  groups: StoryGroup[]
  /** Чьи истории загружены: общая лента или сообщество. */
  source: CommunitySource | null
  loading: boolean
  error: string
  /** Просмотр: индекс группы и истории в ней; null — закрыт. */
  viewer: { group: number; story: number } | null
  uploading: boolean
  load: () => Promise<void>
  /** Загрузить истории сообщества вместо общей ленты. */
  loadCommunity: (source: CommunitySource) => Promise<void>
  /** Обновить то, что загружено сейчас (лента или сообщество). */
  reload: () => Promise<void>
  /** Добавить историю-картинку (подпись необязательна). */
  create: (image: File, text?: string, communityId?: number) => Promise<boolean>
  remove: (storyId: number) => Promise<void>
  /** Открыть просмотр с группы пользователя: с указанной истории или, если не указана, с первой непросмотренной. */
  open: (userId: number, storyId?: number) => void
  close: () => void
  /** Перейти на историю вперёд (1) или назад (-1); за краем группы — к соседней, в конце закрывает. */
  step: (delta: 1 | -1) => void
  markSeen: (storyId: number) => void
}

export const useStoriesStore = create<StoriesStore>()((set, get) => ({
  groups: [],
  source: null,
  loading: false,
  error: '',
  viewer: null,
  uploading: false,

  load: async () => {
    set({ loading: true, error: '', source: null })
    try {
      const { data } = await client.query({ query: STORIES, fetchPolicy: 'network-only' })
      const groups: StoryGroup[] = (data.getStories ?? []).map((g) => ({
        user: { id: g.user.id ?? 0, login: g.user.login ?? '', avatar: g.user.avatar ?? '' },
        allSeen: g.allSeen,
        stories: g.stories.map((s) => ({
          id: s.id,
          src: s.high || s.medium,
          text: s.text,
          date: toTimestamp(s.date),
          expiresAt: toTimestamp(s.expiresAt),
          seen: s.seen,
          viewsCount: s.viewsCount ?? null,
        })),
      }))
      set({ groups })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Не удалось загрузить истории' })
    } finally {
      set({ loading: false })
    }
  },

  loadCommunity: async (source) => {
    set({ loading: true, error: '', source })
    try {
      const { data } = await client.query({
        query: COMMUNITY_STORIES,
        variables: { id: source.id },
        fetchPolicy: 'network-only',
      })
      const stories: Story[] = (data.getCommunityStories ?? []).map((s) => ({
        id: s.id,
        src: s.high || s.medium,
        text: s.text,
        date: toTimestamp(s.date),
        expiresAt: toTimestamp(s.expiresAt),
        seen: s.seen,
        viewsCount: s.viewsCount ?? null,
      }))
      // Ответ устаревшего запроса не должен подменить истории другого сообщества
      if (get().source?.id !== source.id) return
      set({
        groups: stories.length
          ? [
              {
                user: { id: -source.id, login: source.name, avatar: source.avatar },
                community: { id: source.id, canManage: source.canManage },
                stories,
                allSeen: stories.every((s) => s.seen),
              },
            ]
          : [],
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Не удалось загрузить истории' })
    } finally {
      set({ loading: false })
    }
  },

  reload: async () => {
    const source = get().source
    if (source) await get().loadCommunity(source)
    else await get().load()
  },

  create: async (image, text, communityId) => {
    set({ uploading: true, error: '' })
    try {
      await client.mutate({ mutation: CREATE_STORY, variables: { image, text: text?.trim() || null, communityId } })
      await get().reload()
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Не удалось добавить историю' })
      return false
    } finally {
      set({ uploading: false })
    }
  },

  remove: async (storyId) => {
    try {
      await client.mutate({ mutation: DELETE_STORY, variables: { id: storyId } })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Не удалось удалить историю' })
      return
    }
    // Если удалили последнюю историю в просмотре, окно закроется само
    set({ viewer: null })
    await get().reload()
  },

  open: (userId, storyId) => {
    const group = get().groups.findIndex((g) => g.user.id === userId)
    if (group < 0) return
    const stories = get().groups[group].stories
    const chosen = storyId === undefined ? -1 : stories.findIndex((s) => s.id === storyId)
    const first = chosen >= 0 ? chosen : stories.findIndex((s) => !s.seen)
    set({ viewer: { group, story: first < 0 ? 0 : first } })
  },

  close: () => {
    set({ viewer: null })
    // Порядок и обводки обновятся по данным сервера
    void get().reload()
  },

  step: (delta) => {
    const { viewer, groups } = get()
    if (!viewer) return
    const story = viewer.story + delta
    const current = groups[viewer.group]
    if (current && story >= 0 && story < current.stories.length) return set({ viewer: { group: viewer.group, story } })
    const group = viewer.group + delta
    if (group < 0) return
    if (group >= groups.length) return get().close()
    set({ viewer: { group, story: delta === 1 ? 0 : groups[group].stories.length - 1 } })
  },

  markSeen: (storyId) => {
    const me = RefreshStore.getState().refreshData.id ?? 0
    set((state) => ({
      groups: state.groups.map((g) => {
        const stories = g.stories.map((s) => (s.id === storyId ? { ...s, seen: true } : s))
        // Группа «просмотрена» обновится только при закрытии, чтобы кружки не прыгали под пальцем
        return { ...g, stories }
      }),
    }))
    if (me) void client.mutate({ mutation: VIEW_STORY, variables: { id: storyId } }).catch(() => undefined)
  },
}))

import { create } from 'zustand'

import { RefreshStore } from '@/app/providers/routes/model'

/** Черновики: недописанный текст по собеседникам. Хранятся в localStorage отдельно для каждого пользователя. */
const storageKey = (myId: number) => `anidale:drafts:${myId}`

const load = (myId: number): Record<number, string> => {
  if (!myId) return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(myId)) ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

interface DraftsStore {
  /** id пользователя, чьи черновики загружены. */
  owner: number
  drafts: Record<number, string>
  /** Пустой текст удаляет черновик. */
  setDraft: (userId: number, text: string) => void
}

export const useDraftsStore = create<DraftsStore>()((set, get) => ({
  owner: 0,
  drafts: {},
  setDraft: (userId, text) => {
    const myId = RefreshStore.getState().refreshData.id ?? 0
    if (!myId) return
    // Сменился пользователь: начинаем с его черновиков
    const base = get().owner === myId ? get().drafts : load(myId)
    const drafts = { ...base }
    if (text.trim()) drafts[userId] = text
    else delete drafts[userId]
    set({ owner: myId, drafts })
    try {
      localStorage.setItem(storageKey(myId), JSON.stringify(drafts))
    } catch {
      // Хранилище переполнено или отключено: черновик живёт только до перезагрузки
    }
  },
}))

/** Черновик для собеседника у текущего пользователя (при необходимости подгружает из localStorage). */
export const getDraft = (userId: number): string => {
  const myId = RefreshStore.getState().refreshData.id ?? 0
  if (!myId) return ''
  const state = useDraftsStore.getState()
  if (state.owner !== myId) {
    const drafts = load(myId)
    useDraftsStore.setState({ owner: myId, drafts })
    return drafts[userId] ?? ''
  }
  return state.drafts[userId] ?? ''
}

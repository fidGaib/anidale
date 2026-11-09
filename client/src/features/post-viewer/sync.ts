import { create } from 'zustand'

/** Изменение счётчиков поста, которое нужно показать везде, где этот пост открыт (лента, окно поста, просмотр фото). */
export interface PostPatch {
  id: number
  liked?: boolean
  likesCount?: number
  commentsCount?: number
  description?: string
  /** Когда пост правили (мс). */
  editedAt?: number
  pinned?: boolean
  archived?: boolean
  bookmarked?: boolean
  views?: number
  repostsCount?: number
  /** Из поста удалили видео с этим id: убрать ролик из карточки. */
  removedVideoId?: number
  /** Пост удалён: убрать отовсюду. */
  removed?: boolean
}

interface PostSyncStore {
  patch: PostPatch | null
  /** Номер изменения: одинаковые патчи подряд тоже должны дойти до подписчиков. */
  version: number
  publish: (patch: PostPatch) => void
}

export const usePostSync = create<PostSyncStore>()((set) => ({
  patch: null,
  version: 0,
  publish: (patch) => set((state) => ({ patch, version: state.version + 1 })),
}))

import { create } from 'zustand'

interface ShareStore {
  /** Пост, которым делятся, и сколько у него репостов (чтобы обновить счётчик). */
  target: { id: number; repostsCount: number } | null
  open: (id: number, repostsCount: number) => void
  close: () => void
}

export const useShareStore = create<ShareStore>()((set) => ({
  target: null,
  open: (id, repostsCount) => set({ target: { id, repostsCount } }),
  close: () => set({ target: null }),
}))

/** Открывает окно «Поделиться» для поста. */
export const openShare = (id: number, repostsCount = 0) => useShareStore.getState().open(id, repostsCount)

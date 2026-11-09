import { create } from 'zustand'

/** Изображение для полноэкранного просмотра. */
export interface ViewerPhoto {
  /** Ссылка на картинку для показа. */
  src: string
  /** Подпись и имя файла при скачивании. */
  name?: string
  /** Данные для сохранения чужого фото: источник, id и текущее состояние. */
  save?: {
    source: string
    id: number
    postId?: number | null
    ownerId: number
    saved: boolean
  }
}

interface PhotoViewerStore {
  photos: ViewerPhoto[]
  index: number
  /** Пост, к которому относятся изображения: рядом показываются автор, описание, лайки и комментарии. */
  postId: number | null
  open: boolean
  show: (photos: ViewerPhoto[], index?: number, postId?: number | null) => void
  close: () => void
  go: (delta: number) => void
  setIndex: (index: number) => void
}

export const usePhotoViewer = create<PhotoViewerStore>()((set, get) => ({
  photos: [],
  index: 0,
  postId: null,
  open: false,

  show: (photos, index = 0, postId = null) => {
    if (photos.length === 0) return
    set({ photos, index: Math.min(Math.max(index, 0), photos.length - 1), postId, open: true })
  },

  close: () => set({ open: false, photos: [], index: 0, postId: null }),

  // По кругу: после последнего снова первое, как в ВК
  go: (delta) => {
    const { photos, index } = get()
    if (photos.length < 2) return
    set({ index: (index + delta + photos.length) % photos.length })
  },

  setIndex: (index) => set((state) => ({ index: Math.min(Math.max(index, 0), state.photos.length - 1) })),
}))

/** Открывает просмотр изображений. Работает из любого места приложения, окно рисует PhotoViewerHost. */
export const openPhotos = (photos: ViewerPhoto[], index = 0, postId: number | null = null) =>
  usePhotoViewer.getState().show(photos, index, postId)

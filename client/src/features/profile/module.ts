import { create } from 'zustand'

import { client } from '@/app/providers/apollo-client'
import { BOOKMARKS, POSTS, POST_BY_USER } from '@/shared/graphql/schema'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { toTimestamp } from '@/shared/lib/time'
import { validateUpload } from '@/shared/lib/upload-limits'

import { Post, PostStore } from './types'

interface RawPost {
  id?: number | null
  description?: string | null
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
  likesCount?: number | null
  liked?: boolean | null
  commentsCount?: number | null
  date?: unknown
  editedAt?: unknown
  pinned?: boolean | null
  archived?: boolean | null
  views?: number | null
  repostsCount?: number | null
  bookmarked?: boolean | null
  repostDeleted?: boolean | null
  repostOf?: {
    id?: number | null
    description?: string | null
    date?: unknown
    user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
    images?: (RawImage | null)[] | null
    videos?: (RawVideo | null)[] | null
  } | null
  images?: (RawImage | null)[] | null
  videos?: (RawVideo | null)[] | null
}

interface RawImage {
  id?: number | null
  high?: string | null
  small?: string | null
  medium?: string | null
  type?: string | null
  saved?: boolean | null
}

interface RawVideo {
  id?: number | null
  title?: string | null
  file?: string | null
  size?: number | null
  type?: string | null
  date?: unknown
  postId?: number | null
  saved?: boolean | null
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
}

const toImages = (images?: (RawImage | null)[] | null) =>
  (images ?? []).flatMap((image) =>
    image
      ? [
          {
            id: image.id ?? 0,
            high: image.high ?? '',
            small: image.small ?? '',
            medium: image.medium ?? '',
            type: image.type ?? '',
            saved: !!image.saved,
          },
        ]
      : [],
  )

const toVideos = (videos?: (RawVideo | null)[] | null) =>
  (videos ?? []).flatMap((video) =>
    video
      ? [
          {
            id: video.id ?? 0,
            title: video.title ?? '',
            file: video.file ?? '',
            size: video.size ?? 0,
            type: video.type ?? '',
            date: video.date,
            postId: video.postId ?? null,
            saved: !!video.saved,
            user: video.user
              ? { id: video.user.id ?? 0, login: video.user.login ?? '', avatar: video.user.avatar ?? '' }
              : undefined,
          },
        ]
      : [],
  )

/** Приводит ответ GraphQL (все поля nullable) к типу, с которым работает UI. */
export const toPost = (post: RawPost): Post => ({
  date: toTimestamp(post.date),
  editedAt: toTimestamp(post.editedAt),
  pinned: post.pinned ?? false,
  archived: post.archived ?? false,
  views: post.views ?? 0,
  repostsCount: post.repostsCount ?? 0,
  bookmarked: post.bookmarked ?? false,
  repostDeleted: post.repostDeleted ?? false,
  repostOf: post.repostOf
    ? {
        id: post.repostOf.id ?? 0,
        description: post.repostOf.description ?? '',
        date: toTimestamp(post.repostOf.date),
        user: {
          id: post.repostOf.user?.id ?? 0,
          login: post.repostOf.user?.login ?? '',
          avatar: post.repostOf.user?.avatar ?? '',
        },
        images: toImages(post.repostOf.images),
        videos: toVideos(post.repostOf.videos),
      }
    : null,
  id: post.id ?? 0,
  description: post.description ?? '',
  likesCount: post.likesCount ?? 0,
  liked: post.liked ?? false,
  commentsCount: post.commentsCount ?? 0,
  user: {
    id: post.user?.id ?? 0,
    login: post.user?.login ?? '',
    avatar: post.user?.avatar ?? '',
  },
  images: toImages(post.images),
  videos: toVideos(post.videos),
})

//post
export const usePostStore = create<PostStore>()((set, get) => ({
  description: '',
  images: [],
  videos: [],
  error_create: '',
  createdPost: null,
  uploadProgress: null,
  clearCreatedPost() {
    set(() => ({ createdPost: null }))
  },
  setError(message) {
    set(() => ({ error_create: message }))
  },
  changeText(description) {
    if (description.length > 255) return
    set(() => ({ description }))
  },
  fetchBookmarks: async (page: number, limit: number) => {
    const { data } = await client.query({ query: BOOKMARKS, variables: { limit, page }, fetchPolicy: 'network-only' })
    return (data.getBookmarks ?? []).map(toPost)
  },
  fetchPostsFeed: async (page: number, limit: number) => {
    const { data } = await client.query({
      query: POSTS,
      variables: { limit, page },
      fetchPolicy: 'network-only',
    })

    return (data.getPosts ?? []).map(toPost)
  },
  fetchPostsProfile: async (id: number, page: number, limit: number) => {
    const { data } = await client.query({
      query: POST_BY_USER,
      variables: { id, limit, page },
      fetchPolicy: 'network-only',
    })

    return (data.getPostsByUser ?? []).map(toPost)
  },
  setFiles: async (fileList) => {
    get().setError('')
    const files = Array.from(fileList)
    const compressed = await Promise.all(files.map((f) => compress(f)))
    // Картинки тоже входят в тот же запрос, что и видео
    const problem = validateUpload(compressed, [...get().images, ...get().videos])
    if (problem) return get().setError(problem)
    set((state) => ({ images: [...state.images, ...compressed] }))
  },

  removeImage: (image) => {
    const array = get().images.filter((item) => item !== image)
    set(() => ({
      images: array,
    }))
  },
  setVideoFiles: (fileList) => {
    get().setError('')
    const files = Array.from(fileList)
    const problem = validateUpload(files, [...get().images, ...get().videos])
    if (problem) return get().setError(problem)
    set((state) => ({ videos: [...state.videos, ...files] }))
  },
  removeVideo: (video) => {
    set(() => ({ videos: get().videos.filter((item) => item !== video) }))
  },
  send: async (schemaFn, owner) => {
    const hasImages = get().images.length > 0
    const hasVideos = get().videos.length > 0
    if (!get().description.trim() && !hasImages && !hasVideos) return
    // Прогресс показываем только когда есть что загружать
    if (hasImages || hasVideos) set({ uploadProgress: 0 })
    try {
      const res: any = await schemaFn({
        variables: { owner, description: get().description, images: get().images, videos: get().videos },
        context:
          hasImages || hasVideos
            ? {
                fetchOptions: { onProgress: (event: UploadProgressEvent) => set({ uploadProgress: toPercent(event) }) },
              }
            : undefined,
      })
      const created = res?.data?.createPost
      set(() => ({
        description: '',
        images: [],
        videos: [],
        error: '',
        createdPost: created ? toPost(created) : null,
      }))
    } catch {
      // Ошибку показывает MakePost из состояния самой мутации
    } finally {
      set({ uploadProgress: null })
    }
  },
  handleHeight: (e) => {
    get().changeText(e.target.value)
    const el = e.target
    if (el) {
      el.style.height = '45px'
      el.style.height = el.scrollHeight + 'px'
    }
  },
  handleKeydown: ({ key, shiftKey }, createPost, owner) => {
    if (key === 'Enter' && !shiftKey) return get().send(createPost, owner)
  },
}))
async function compress(file: File, maxSide = 1920, quality = 0.8): Promise<File> {
  if (file.type === 'image/gif') return file // gif не трогаем, анимацию испортим

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d недоступен')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('не удалось сжать изображение'))), 'image/webp', quality),
  )
  return new File([blob], file.name, { type: 'image/webp' })
}

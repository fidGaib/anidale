import { create } from 'zustand'

import { client } from '@/app/providers/with-router'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import { Post, PostStore } from './types'

interface RawPost {
  id?: number | null
  description?: string | null
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
  images?: Array<{
    id?: number | null
    small?: string | null
    medium?: string | null
    type?: string | null
  } | null> | null
}

/** Приводит ответ GraphQL (все поля nullable) к типу, с которым работает UI. */
const toPost = (post: RawPost): Post => ({
  id: post.id ?? 0,
  description: post.description ?? '',
  user: {
    id: post.user?.id ?? 0,
    login: post.user?.login ?? '',
    avatar: post.user?.avatar ?? '',
  },
  images: (post.images ?? []).flatMap((image) =>
    image ? [{ id: image.id ?? 0, small: image.small ?? '', medium: image.medium ?? '', type: image.type ?? '' }] : [],
  ),
})

//post
export const usePostStore = create<PostStore>()((set, get) => ({
  description: '',
  images: [],
  error_create: '',
  setError(message) {
    set(() => ({ error_create: message }))
  },
  changeText(description) {
    if (description.length > 255) return
    set(() => ({ description }))
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
    set((state) => ({ images: [...state.images, ...compressed] }))
  },

  removeImage: (image) => {
    const array = get().images.filter((item) => item !== image)
    set(() => ({
      images: array,
    }))
  },
  send: async (schemaFn, owner) => {
    if (!get().description.trim() && get().images.length === 0) return
    await schemaFn({ variables: { owner, description: get().description, images: get().images } }).then((res: any) => {
      set(() => ({
        description: '',
        images: [],
        error: '',
      }))
    })
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

  const canvas = new OffscreenCanvas(w, h)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
  return new File([blob], file.name, { type: 'image/webp' })
}

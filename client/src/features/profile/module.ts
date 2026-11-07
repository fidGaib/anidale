import { create } from 'zustand'

import { client } from '@/app/providers/with-router'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import { PostStore, Post } from './types'

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
    image
      ? [{ id: image.id ?? 0, small: image.small ?? '', medium: image.medium ?? '', type: image.type ?? '' }]
      : [],
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
  setFiles(fileList) {
    get().setError('')
    const files = Array.from(fileList)
    files.map(async (file) => {
      set(() => ({ images: [...get().images, file] }))
    })
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

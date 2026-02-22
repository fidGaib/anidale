import { create } from 'zustand'

import { client } from '@/app/providers/with-router'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import { PostStore } from './types'

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
  //@ts-ignore
  fetchPostsFeed: async (page: number, limit: number) => {
    return await client
      .query({
        query: POSTS,
        variables: { limit, page },
        fetchPolicy: 'network-only',
      })
      .then((res) => {
        return res.data.getPosts
      })
      .catch((e) => console.log(e))
  },
  //@ts-ignore
  fetchPostsProfile: async (id: number, page: number, limit: number) => {
    return await client
      .query({
        query: POST_BY_USER,
        variables: { id, limit, page },
        fetchPolicy: 'network-only',
      })
      .then((res) => {
        return res.data.getPostsByUser
      })
      .catch((e) => console.log(e))
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

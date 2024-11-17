import { create } from 'zustand'

import { client } from '@/app/providers/with-router'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import { PostStore } from './types'

export const usePostStore = create<PostStore>()((set, get) => ({
  refetch: false,
  limit: 5,
  page: 0,
  posts: [],
  removeId: 0,
  description: '',
  images: [],
  error_create: '',
  setPage(page) {
    set((state) => ({ page: page }))
  },
  setError(message) {
    set(() => ({ error_create: message }))
  },
  changeText(description) {
    if (description.length > 255) return
    set(() => ({ description }))
  },
  addPost: (id) => {
    let typeRequest = { POST_BY_USER, POSTS },
      request
    if (id) request = typeRequest.POST_BY_USER
    else request = typeRequest.POSTS
    client
      .query({
        query: request,
        variables: { id, limit: get().limit, page: get().page },
        fetchPolicy: 'network-only',
      })
      .then((res) => {
        if (id) {
          // @ts-ignore
          set((state) => ({ posts: [...state.posts, ...res.data.getPostsByUser] }))
          get().setPage(get().posts.length)
        } else {
          // @ts-ignore
          set((state) => ({ posts: [...state.posts, ...res.data.getPosts] }))
          get().setPage(get().posts.length)
        }
        console.log(get().page)
      })
      .catch((e) => console.log(e))
  },
  setRefetch: (flag) => {
    set(() => ({ refetch: flag }))
  },
  removePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
    })),
  setRemoveId: (id) => set(() => ({ removeId: id })),
  clearPosts: () =>
    set(() => ({
      posts: [],
      removeId: 0,
    })),
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
      // const post = res?.data?.createPost
      // get().addPost([post])
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

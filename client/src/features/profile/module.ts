import { create } from 'zustand'

import { client } from '@/app/providers/with-router'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import { PostStore } from './types'

export const usePostStore = create<PostStore>()((set, get) => ({
  refetch: false,
  limit: 5,
  feedPage: 0,
  profilePage: 0,
  feedPosts: [],
  profilePosts: [],
  removeId: 0,
  description: '',
  images: [],
  error_create: '',
  setFeedPage(page) {
    set((state) => ({ feedPage: page }))
  },
  setProfilePage(page) {
    set((state) => ({ profilePage: page }))
  },
  setError(message) {
    set(() => ({ error_create: message }))
  },
  changeText(description) {
    if (description.length > 255) return
    set(() => ({ description }))
  },
  addPost: (id) => {
    if (id) {
      client
        .query({
          query: POST_BY_USER,
          variables: { id, limit: get().limit, page: get().profilePage },
          fetchPolicy: 'network-only',
        })
        .then((res) => {
          // @ts-ignore
          set((state) => ({ profilePosts: [...state.profilePosts, ...res.data.getPostsByUser] }))
          get().setProfilePage(get().profilePosts.length)
        })
        .catch((e) => console.log(e))
    } else {
      client
        .query({
          query: POSTS,
          variables: { id, limit: get().limit, page: get().feedPage },
          fetchPolicy: 'network-only',
        })
        .then((res) => {
          // @ts-ignore
          set((state) => ({ feedPosts: [...state.feedPosts, ...res.data.getPosts] }))
          get().setFeedPage(get().feedPosts.length)
        })
        .catch((e) => console.log(e))
    }
  },
  setRefetch: (flag) => {
    set(() => ({ refetch: flag }))
  },
  removePost: (id) => {
    set((state) => ({
      profilePosts: state.profilePosts.filter((post) => post.id !== id),
    }))
    set((state) => ({
      feedPosts: state.feedPosts.filter((post) => post.id !== id),
    }))
  },
  setRemoveId: (id) => set(() => ({ removeId: id })),
  clearPosts: () =>
    set(() => ({
      feedPosts: [],
      profilePosts: [],
      feedPage: 0,
      profilePage: 0,
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

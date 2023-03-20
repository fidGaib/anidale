import { create } from 'zustand'

import { PostStore } from './types'

export const usePostStore = create<PostStore>()((set) => ({
  posts: [],
  removeId: 0,
  description: '',
  images: [],
  error: '',
  //set error
  setError(message) {
    set((state) => ({ error: message }))
  },
  //set text
  changeText(description) {
    if (description.length > 255) {
      set((state) => ({ error: 'Не более 255 символов' }))
    }
    set((state) => ({ description }))
  },
  //add
  addPost: (post) => set((state) => ({ posts: [...post, ...state.posts] })),
  //remove
  removePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
    })),
  //set removeId
  setRemoveId: (id) => set((state) => ({ removeId: id })),
  // clear unmount
  clearPosts: () =>
    set((state) => ({
      posts: [],
      removeId: 0,
    })),
  //set images
  setFiles(fileList, store) {
    store.setError('')
    let files = Array.from(fileList)
    if (files.length + store.images.length <= 9) {
      files.map(async (file) => {
        const a = await store.validate(file, store)
        if (a === true) {
          set((state) => ({
            images: [...state.images, file],
          }))
        }
      })
    } else {
      let empty = 9 - store.images.length
      let delCount = files.length - empty
      let newArrayFiles = files
      for (let i = 0; i < delCount; i++) {
        newArrayFiles.pop()
      }
      store.setFiles(newArrayFiles, store)
      store.setError(`Последние ${delCount} файла не будут загружены, ограничение 9`)
    }
  },
  //validate images
  async validate(file, { setError }) {
    const re = /(\.jpg|\.jpeg|\.gif|\.png)$/i
    const size = file.size / 1024 / 1024
    const maxSize = 5
    if (!re.exec(file.name)) return setError('Загружать можно только арты.')
    else if (size > maxSize) return setError(`Размер изображения не должен привышать ${maxSize}мб`)
    else return true
  },
}))

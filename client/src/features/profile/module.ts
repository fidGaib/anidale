import { create } from 'zustand'

import { PostStore } from './types'

export const usePostStore = create<PostStore>()((set, get) => ({
  posts: [],
  removeId: 0,
  description: '',
  images: [],
  error: '',
  //set error
  setError(message) {
    set(() => ({ error: message }))
  },
  //set text
  changeText(description) {
    if (description.length > 255) return
    set(() => ({ description }))
  },
  //add
  addPost: (post) => set((state) => ({ posts: [...post, ...state.posts] })),
  //remove
  removePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
    })),
  //set removeId
  setRemoveId: (id) => set(() => ({ removeId: id })),
  // clear unmount
  clearPosts: () =>
    set(() => ({
      posts: [],
      removeId: 0,
    })),
  //set images
  setFiles(fileList) {
    get().setError('')
    const files = Array.from(fileList)
    if (files.length + get().images.length <= 9) {
      files.map(async (file) => {
        const a = await get().validate(file)
        if (a === true) {
          set(() => ({ images: [...get().images, file] }))
        }
      })
    } else {
      const delCount = files.length - (9 - get().images.length)
      for (let i = 0; i < delCount; i++) {
        files.pop()
      }
      get().setFiles(files)
      get().setError(`Последние ${delCount} файла не будут загружены, ограничение 9`)
    }
  },
  //validate images
  async validate(file) {
    const re = /(\.jpg|\.jpeg|\.gif|\.png)$/i
    const size = file.size / 1024 / 1024
    const maxSize = 5
    if (!re.exec(file.name)) return get().setError('Загружать можно только арты.')
    else if (size > maxSize) return get().setError(`Размер изображения не должен привышать ${maxSize}мб`)
    else return true
  },
  removeImage: (image) => {
    const array = get().images.filter((item) => item !== image)
    set(() => ({
      images: array,
    }))
  },
  send: async (schemaFn, owner) => {
    if (!get().description.trim() && get().images.length === 0) return
    if (get().description.trim().length > 255) return get().setError('Не более 255 символов')
    await schemaFn({ variables: { owner, description: get().description, images: get().images } }).then((res: any) => {
      set(() => ({
        description: '',
        images: [],
        error: '',
      }))
      const post = res?.data?.createPost
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      get().addPost([post])
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

export interface User {
  id: number
  login: string
  avatar: string
}
export interface Post {
  id: number
  description: string
  user: User
}
export interface PostStore {
  posts: Post[]
  removeId: number
  description: string
  images: File[] | []
  error: string
  setError: (message: string) => void
  addPost: (post: Post[]) => void
  removePost: (id: number) => void
  clearPosts: () => void
  setRemoveId: (id: number) => void
  changeText: (description: string) => void
  setFiles: (file: FileList | File[], store: PostStore) => void
  validate: (file: File, store: PostStore) => Promise<boolean | void>
  removeImage: (image: File, store: PostStore) => void
  send: (fn: any, store: PostStore, owner: number) => void
  handleHeight: (e: any, store: PostStore) => void
  handleKeydown: (a: any, store: PostStore, createPost: any, owner: number) => void
}

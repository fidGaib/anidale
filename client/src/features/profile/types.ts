export interface User {
  id: number
  login: string
  avatar: string
  email: string
}
export interface PostImages {
  id: number
  high: string
  medium: string
  small: string
  type: string
}
export interface Post {
  id: number
  description: string
  user: User
  images: PostImages[]
}
export interface PostStore {
  refetch: boolean
  limit: number
  feedPage: number
  profilePage: number
  feedPosts: Post[]
  profilePosts: Post[]
  removeId: number
  description: string
  images: File[] | []
  error_create: string
  setFeedPage: (col: number) => void
  setProfilePage: (col: number) => void
  setError: (message: string) => void
  fetchPostsFeed: () => void
  fetchPostsProfile: (id: number) => void
  setRefetch: (flag: boolean) => void
  removePost: (id: number) => void
  clearPosts: () => void
  setRemoveId: (id: number) => void
  changeText: (description: string) => void
  setFiles: (file: FileList | File[]) => void
  // validate: (file: File) => Promise<boolean | void>
  removeImage: (image: File) => void
  send: (fn: any, owner: number) => void
  handleHeight: (e: any) => void
  handleKeydown: (a: any, createPost: any, owner: number) => void
}

export interface User {
  id: number
  login: string
  avatar: string
}
export interface PostImages {
  id: number
  small: string
  medium: string
  type: string
}
export interface Post {
  id: number
  description: string
  user: User
  images: PostImages[]
  likesCount: number
  /** Поставил ли лайк текущий пользователь. */
  liked: boolean
  commentsCount: number
}
export interface PostStore {
  description: string
  images: File[] | []
  error_create: string
  /** Последний созданный пользователем пост: профиль добавляет его в список сразу после ответа мутации. */
  createdPost: Post | null
  clearCreatedPost: () => void
  /** Процент отправленных на сервер байт, пока публикуется пост с картинками; иначе null. */
  uploadProgress: number | null
  setError: (message: string) => void
  fetchPostsFeed: (page: number, limit: number) => Promise<Post[]>
  fetchPostsProfile: (id: number, page: number, limit: number) => Promise<Post[]>
  changeText: (description: string) => void
  setFiles: (file: FileList | File[]) => void
  // validate: (file: File) => Promise<boolean | void>
  removeImage: (image: File) => void
  send: (fn: any, owner: number) => void
  handleHeight: (e: any) => void
  handleKeydown: (a: any, createPost: any, owner: number) => void
}

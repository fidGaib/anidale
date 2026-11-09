import type { ChangeEvent, KeyboardEvent } from 'react'

export interface User {
  id: number
  login: string
  avatar: string
}
export interface PostImages {
  id: number
  high?: string
  /** Сохранил ли картинку текущий пользователь. */
  saved?: boolean
  small: string
  medium: string
  type: string
}
export interface PostVideo {
  id: number
  title: string
  file: string
  size: number
  type: string
  date?: unknown
  postId?: number | null
  /** Сохранил ли видео текущий пользователь. */
  saved?: boolean
  user?: User
}
export interface Post {
  id: number
  description: string
  /** Дата публикации: по GraphQL число (мс), по сокету строка ISO. */
  date?: unknown
  user: User
  images: PostImages[]
  videos: PostVideo[]
  likesCount: number
  /** Поставил ли лайк текущий пользователь. */
  liked: boolean
  commentsCount: number
  editedAt?: number
  pinned?: boolean
  archived?: boolean
  views?: number
  repostsCount?: number
  bookmarked?: boolean
  repostDeleted?: boolean
  /** Статья: если задана, пост показывается карточкой статьи. */
  article?: { id: number; title: string; cover: string; excerpt: string } | null
  /** Сообщество, на стене которого опубликована запись. */
  community?: { id: number; name: string; avatar: string } | null
  /** Исходный пост, если это репост и оригинал не удалён. */
  repostOf?: RepostSource | null
}
export interface RepostSource {
  id: number
  description: string
  date: number
  user: User
  images: PostImages[]
  videos: PostVideo[]
}
export interface PostStore {
  description: string
  images: File[] | []
  videos: File[] | []
  error_create: string
  /** Последний созданный пользователем пост: профиль добавляет его в список сразу после ответа мутации. */
  createdPost: Post | null
  clearCreatedPost: () => void
  /** Процент отправленных на сервер байт, пока публикуется пост с картинками; иначе null. */
  uploadProgress: number | null
  setError: (message: string) => void
  fetchPostsFeed: (page: number, limit: number) => Promise<Post[]>
  fetchBookmarks: (page: number, limit: number) => Promise<Post[]>
  fetchPostsProfile: (id: number, page: number, limit: number, kind?: WallKind, search?: string) => Promise<Post[]>
  fetchPostsCommunity: (id: number, page: number, limit: number) => Promise<Post[]>
  changeText: (description: string) => void
  setFiles: (file: FileList | File[]) => void
  setVideoFiles: (file: FileList | File[]) => void
  // validate: (file: File) => Promise<boolean | void>
  removeImage: (image: File) => void
  removeVideo: (video: File) => void
  send: (fn: CreatePostFn, owner: number, communityId?: number) => void
  handleHeight: (e: ChangeEvent<HTMLTextAreaElement>) => void
  handleKeydown: (e: KeyboardEvent<HTMLTextAreaElement>, createPost: CreatePostFn, owner: number) => void
}

/** Мутация создания поста в том виде, в каком её отдаёт useMutation. */
export type CreatePostFn = (options: {
  variables: { owner: number; description: string; images: File[]; videos: File[]; communityId?: number }
  context?: Record<string, unknown>
}) => Promise<{ data?: { createPost?: unknown } | null }>

/** Вид стены профиля: все записи, только собственные (без репостов) или архив (виден лишь автору). */
export type WallKind = 'all' | 'own' | 'archive'

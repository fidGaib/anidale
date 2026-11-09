import MusicController from '@/api/music/controller'
import PostService from '@/api/post/service'
import UserService from '@/api/user/service'
import { Post } from '@/db/models/post-model'
import User from '@/db/models/user-model'

const MAX_QUERY_LENGTH = 100
const MAX_PAGE_LIMIT = 30

export type SearchType = 'all' | 'users' | 'posts' | 'music'

class SearchController {
  /**
   * Общий поиск по людям (логин), постам (текст) и музыке (название, исполнитель).
   * type = all — по несколько первых результатов каждого раздела; иначе постранично только выбранный раздел.
   * Счётчики разделов возвращаются всегда: по ним клиент рисует вкладки.
   */
  async search(query: string, type: SearchType, limit: number, page: number, viewerId?: number) {
    const q = query.trim().slice(0, MAX_QUERY_LENGTH)
    const empty = {
      users: [] as Awaited<ReturnType<typeof UserService.list>>,
      posts: [] as Awaited<ReturnType<typeof PostService.find>>,
      music: [] as Awaited<ReturnType<typeof MusicController.getAllMusic>>,
      usersTotal: 0,
      postsTotal: 0,
      musicTotal: 0,
    }
    if (!q) return empty

    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const pageNum = type === 'all' ? 0 : Math.max(Math.trunc(page) || 0, 0)
    const [usersTotal, postsTotal, musicTotal] = await Promise.all([
      User.count({ where: { login: { contains: q, mode: 'insensitive' } } }),
      Post.count({ where: { description: { contains: q, mode: 'insensitive' } } }),
      MusicController.countAll(q),
    ])
    const [users, posts, music] = await Promise.all([
      type === 'all' || type === 'users' ? UserService.list(take, pageNum * take, q) : empty.users,
      type === 'all' || type === 'posts' ? PostService.find(take, pageNum, undefined, viewerId, q) : empty.posts,
      type === 'all' || type === 'music' ? MusicController.getAllMusic(take, pageNum, q) : empty.music,
    ])
    return { users, posts, music, usersTotal, postsTotal, musicTotal }
  }
}

export default new SearchController()

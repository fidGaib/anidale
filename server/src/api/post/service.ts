// import { io } from '@/index'
import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import { Post, PostImage } from '@/db/models/post-model'

import { articleFiles } from '../article/content'
import { canViewCommunity, isBanned, isCommunityAdmin, isCommunityMember } from '../community/access'
import VideoStorageService from '../video/video-service'
import FileStorageService, { SaveImage } from './file-service'

const MAX_PAGE_LIMIT = 50

const userSel = { select: { id: true, avatar: true, login: true } }
const MAX_DESCRIPTION = 2000
const MAX_VIEW_IDS = 50
export const REPORT_REASONS = ['spam', 'abuse', 'adult', 'violence', 'other']

/** Что подгружать вместе с постом: картинки, автор, счётчики, исходный пост репоста и личные признаки просматривающего. */
/** Отметки «сохранено» просматривающим для картинок и видео поста. */
const savedBy = (viewerId?: number) =>
  viewerId ? { savedBy: { where: { userId: viewerId }, select: { id: true }, take: 1 } } : {}

const postInclude = (viewerId?: number) => ({
  images: viewerId ? { include: savedBy(viewerId) } : true,
  videos: { include: { user: userSel, ...savedBy(viewerId) } },
  user: userSel,
  article: { select: { id: true, title: true, cover: true, excerpt: true } },
  community: { select: { id: true, name: true, avatar: true } },
  _count: { select: { likes: true, comments: true, reposts: true } },
  repostOf: {
    select: {
      id: true,
      description: true,
      date: true,
      user: userSel,
      images: true,
      videos: { include: { user: userSel } },
    },
  },
  // Личные признаки (лайк, закладка) нужны только вошедшему пользователю
  ...(viewerId
    ? {
        likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
        bookmarks: { where: { userId: viewerId }, select: { id: true }, take: 1 },
      }
    : {}),
})

/** Превращает связь savedBy у картинок и видео поста в булево поле saved. Тип поста не меняется. */
const attachSaved = <P extends object>(post: P): P => {
  const mark = (items: unknown) =>
    Array.isArray(items)
      ? items.map(({ savedBy: saved, ...item }: { savedBy?: { id: number }[] }) => ({
          ...item,
          saved: (saved?.length ?? 0) > 0,
        }))
      : items
  const { images, videos } = post as { images?: unknown; videos?: unknown }
  return { ...post, ...(images ? { images: mark(images) } : {}), ...(videos ? { videos: mark(videos) } : {}) }
}

/** Вид стены профиля: все записи, только собственные (без репостов) или архив. */
export type WallKind = 'all' | 'own' | 'archive'
export const WALL_KINDS: WallKind[] = ['all', 'own', 'archive']

class PostService {
  /** Добавляет к посту счётчики и личные признаки просматривающего (лайк, закладка). */
  static withStats<
    T extends {
      _count?: { likes: number; comments: number; reposts?: number }
      likes?: { id: number }[]
      bookmarks?: { id: number }[]
    },
  >(post: T) {
    const { _count, likes, bookmarks, ...rest } = post
    return {
      ...attachSaved(rest),
      likesCount: _count?.likes ?? 0,
      commentsCount: _count?.comments ?? 0,
      repostsCount: _count?.reposts ?? 0,
      liked: (likes?.length ?? 0) > 0,
      bookmarked: (bookmarks?.length ?? 0) > 0,
    }
  }

  /**
   * Посты ленты или стены профиля. kind работает на стене (userId задан):
   * all — все записи, own — только собственные без репостов, archive — архив, виден лишь самому автору.
   * Архивные посты не попадают ни в ленту, ни в «Главную» и «Мои посты», даже у автора.
   */
  async find(limit: number, page: number, userId?: number, viewerId?: number, search?: string, kind: WallKind = 'all') {
    // Чужой архив не показываем никому: пустой ответ, а не ошибка, чтобы не выдавать наличие архива
    if (kind === 'archive' && (!userId || viewerId !== userId)) return []
    // Защита от запросов вида limit = 1000000 и отрицательных значений
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    const posts = await Post.findMany({
      take,
      skip,
      where: {
        // На стене человека нет записей, которые он написал от имени сообщества
        ...(userId ? { owner: userId, communityId: null } : {}),
        ...(search ? { description: { contains: search, mode: 'insensitive' as const } } : {}),
        archived: kind === 'archive',
        suggested: false,
        // Общая лента и поиск не показывают записи закрытых сообществ
        ...(userId ? {} : { OR: [{ communityId: null }, { community: { isClosed: false } }] }),
        ...(kind === 'own' ? { repostOfId: null } : {}),
      },
      // На странице автора закреплённый пост идёт первым
      orderBy: userId ? [{ pinned: 'desc' as const }, { id: 'desc' as const }] : [{ id: 'desc' as const }],
      include: postInclude(viewerId),
    })
    return posts.map((post) => PostService.withStats(post))
  }

  /** Стена сообщества: закреплённая запись первой, архивные не показываются. */
  async findByCommunity(communityId: number, limit: number, page: number, viewerId?: number) {
    // Закрытое сообщество показывает стену только участникам
    if (!(await canViewCommunity(communityId, viewerId))) return []
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    const posts = await Post.findMany({
      take,
      skip,
      where: { communityId, archived: false, suggested: false },
      orderBy: [{ pinned: 'desc' as const }, { id: 'desc' as const }],
      include: postInclude(viewerId),
    })
    return posts.map((post) => PostService.withStats(post))
  }

  /** Предложенные записи, ожидающие решения администратора (старые первыми). */
  async findSuggested(communityId: number, adminId: number, limit: number, page: number) {
    if (!(await isCommunityAdmin(communityId, adminId))) throw createGraphQLError('Нет доступа')
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    const posts = await Post.findMany({
      take,
      skip,
      where: { communityId, suggested: true },
      orderBy: { id: 'asc' },
      include: postInclude(adminId),
    })
    return posts.map((post) => PostService.withStats(post))
  }

  /** Принять предложенную запись (она появится на стене) или отклонить (будет удалена). Возвращает автора записи. */
  async reviewSuggested(adminId: number, postId: number, approve: boolean) {
    const post = await Post.findUnique({ where: { id: postId } })
    if (!post || !post.suggested || !post.communityId) throw createGraphQLError('Предложенная запись не найдена')
    if (!(await isCommunityAdmin(post.communityId, adminId))) throw createGraphQLError('Нет доступа')
    if (approve) {
      // Дата обновляется: запись появляется на стене в момент одобрения
      await Post.update({ where: { id: postId }, data: { suggested: false, date: new Date() } })
    } else {
      await this.remove(postId, adminId)
    }
    return { authorId: post.owner, communityId: post.communityId }
  }

  /** Один пост; null, если его нет или он в архиве у другого автора. */
  async findOne(id: number, viewerId?: number) {
    const post = await Post.findUnique({ where: { id }, include: postInclude(viewerId) })
    if (!post || (post.archived && post.owner !== viewerId)) return null
    // Предложенную запись видят только автор и администраторы сообщества
    if (post.suggested && post.owner !== viewerId) {
      if (!viewerId || !post.communityId || !(await isCommunityAdmin(post.communityId, viewerId))) return null
    }
    // Запись закрытого сообщества — только его участникам
    if (post.communityId && !(await canViewCommunity(post.communityId, viewerId))) return null
    return PostService.withStats(post)
  }

  /** Закладки пользователя, новые посты сверху. Чужие посты из архива не показываются. */
  async findBookmarked(viewerId: number, limit: number, page: number) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    const posts = await Post.findMany({
      take,
      skip,
      where: { bookmarks: { some: { userId: viewerId } }, OR: [{ archived: false }, { owner: viewerId }] },
      orderBy: { id: 'desc' },
      include: postInclude(viewerId),
    })
    return posts.map((post) => PostService.withStats(post))
  }

  /** Править запись может автор; запись на стене сообщества — ещё и любой администратор сообщества. */
  private async canManage(post: { owner: number; communityId: number | null }, userId: number) {
    if (post.owner === userId) return true
    return post.communityId !== null && (await isCommunityAdmin(post.communityId, userId))
  }

  private async own(userId: number, id: number) {
    const post = await Post.findUnique({
      where: { id },
      include: {
        images: { select: { id: true } },
        videos: { select: { id: true } },
        article: { select: { id: true } },
      },
    })
    if (!post) throw createGraphQLError('Пост не найден')
    if (!(await this.canManage(post, userId))) throw createGraphQLError('Нет доступа')
    return post
  }

  async edit(userId: number, id: number, description: string) {
    const post = await this.own(userId, id)
    if (post.article) throw createGraphQLError('Статью можно править только в редакторе статей')
    const clean = description.trim()
    if (clean.length > MAX_DESCRIPTION) throw createGraphQLError(`Текст длиннее ${MAX_DESCRIPTION} символов`)
    if (!clean && post.images.length === 0 && post.videos.length === 0 && !post.repostOfId)
      throw createGraphQLError('Пост не может быть пустым')
    await Post.update({ where: { id }, data: { description: clean, editedAt: new Date() } })
    return await this.findOne(id, userId)
  }

  /** Закрепляет пост на странице автора; закреплённым может быть только один. */
  async pin(userId: number, id: number, pinned: boolean) {
    const post = await this.own(userId, id)
    if (pinned && post.archived) throw createGraphQLError('Пост в архиве: сначала верните его')
    if (pinned) {
      // Закреплённая запись одна: у человека на стене или у сообщества
      const scope = post.communityId ? { communityId: post.communityId } : { owner: userId, communityId: null }
      await Post.updateMany({ where: { ...scope, pinned: true }, data: { pinned: false } })
    }
    await Post.update({ where: { id }, data: { pinned } })
    return true
  }

  async archive(userId: number, id: number, archived: boolean) {
    await this.own(userId, id)
    // В архиве пост не может оставаться закреплённым
    await Post.update({ where: { id }, data: { archived, ...(archived ? { pinned: false } : {}) } })
    return true
  }

  async bookmark(userId: number, id: number, bookmarked: boolean) {
    if (bookmarked) {
      const post = await this.findOne(id, userId)
      if (!post) throw createGraphQLError('Пост не найден')
      await prisma.bookmark.upsert({
        where: { userId_postId: { userId, postId: id } },
        create: { userId, postId: id },
        update: {},
      })
    } else {
      await prisma.bookmark.deleteMany({ where: { userId, postId: id } })
    }
    return true
  }

  async report(userId: number, id: number, reason: string) {
    if (!REPORT_REASONS.includes(reason)) throw createGraphQLError('Выберите причину жалобы')
    const post = await Post.findUnique({ where: { id }, select: { owner: true } })
    if (!post) throw createGraphQLError('Пост не найден')
    if (post.owner === userId) throw createGraphQLError('Нельзя пожаловаться на свой пост')
    await prisma.postReport.upsert({
      where: { userId_postId: { userId, postId: id } },
      create: { userId, postId: id, reason },
      update: { reason },
    })
    return true
  }

  /** Репост на свою страницу с необязательным комментарием. Репост репоста ссылается на исходный пост. */
  async repost(userId: number, id: number, comment?: string | null) {
    const source = await Post.findUnique({ where: { id } })
    if (!source || (source.archived && source.owner !== userId)) throw createGraphQLError('Пост не найден')
    if (!source.repostOfId && source.repostDeleted) throw createGraphQLError('Исходный пост удалён')
    const rootId = source.repostOfId ?? source.id
    const root = source.repostOfId ? await Post.findUnique({ where: { id: rootId } }) : source
    if (!root || (root.archived && root.owner !== userId)) throw createGraphQLError('Исходный пост недоступен')
    const text = (comment ?? '').trim()
    if (text.length > MAX_DESCRIPTION) throw createGraphQLError(`Текст длиннее ${MAX_DESCRIPTION} символов`)
    const created = await Post.create({ data: { owner: userId, description: text, repostOfId: rootId } })
    return { post: await this.findOne(created.id, userId), rootOwner: root.owner, rootId }
  }

  /**
   * Засчитывает просмотры постов вошедшим пользователем: один человек даёт посту не больше одного просмотра.
   * Автор своих постов просмотры не накручивает, архивные и несуществующие посты пропускаются.
   * Возвращает актуальные счётчики по всем запрошенным постам (в том числе по тем, где просмотр не засчитан).
   */
  async view(userId: number, ids: number[]) {
    const list = [...new Set(ids)].slice(0, MAX_VIEW_IDS)
    if (list.length === 0) return []
    const posts = await Post.findMany({
      where: { id: { in: list }, archived: false },
      select: { id: true, owner: true },
    })
    const countable = posts.filter((post) => post.owner !== userId)
    for (const post of countable) {
      // Запись просмотра и счётчик меняются вместе: счётчик растёт, только если запись новая
      await prisma.$transaction(async (tx) => {
        const created = await tx.postView.createMany({ data: [{ postId: post.id, userId }], skipDuplicates: true })
        if (created.count > 0) await tx.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      })
    }
    return await Post.findMany({ where: { id: { in: posts.map((p) => p.id) } }, select: { id: true, views: true } })
  }

  async create(owner: number, description: string, images?: File[], videos?: File[], communityId?: number | null) {
    // Администратор публикует сразу, участник предлагает запись на модерацию
    let suggested = false
    if (communityId && !(await isCommunityAdmin(communityId, owner))) {
      if (await isBanned(communityId, owner)) throw createGraphQLError('Вы в чёрном списке сообщества')
      if (!(await isCommunityMember(communityId, owner))) {
        throw createGraphQLError('Предлагать записи могут только участники сообщества')
      }
      suggested = true
    }
    const storage = new FileStorageService(storagePath)
    const videoStorage = new VideoStorageService(storagePath)
    // Файлы сохраняем до записи в БД; если запись не удалась, удаляем их, чтобы не копить мусор
    let postImages: SaveImage[] = []
    let postVideos: Awaited<ReturnType<VideoStorageService['save']>>[] = []
    try {
      postImages = images?.length ? await Promise.all(images.map((image) => storage.saveImage(image, 'posts/'))) : []
      postVideos = videos?.length ? await Promise.all(videos.map((video) => videoStorage.save(video))) : []
      // Пост, картинки и видео создаются одним вложенным запросом, Prisma выполняет его атомарно
      const post = await Post.create({
        data: {
          owner,
          description,
          communityId: communityId || null,
          suggested,
          images: {
            create: postImages.map((info) => ({
              high: info.high,
              medium: info.medium,
              small: info.small,
              vertical: info.vertical,
              type: info.type,
            })),
          },
          videos: {
            create: postVideos.map((info) => ({
              ownerId: owner,
              title: info.title,
              file: info.file,
              size: info.size,
              type: info.type,
            })),
          },
        },
        include: {
          images: true,
          videos: { include: { user: userSel } },
          community: { select: { id: true, name: true, avatar: true } },
          user: {
            select: {
              id: true,
              avatar: true,
              login: true,
            },
          },
        },
      })
      return { post, images: post.images, videos: post.videos }
    } catch (error) {
      if (postImages.length) await storage.removeFiles(postImages)
      await Promise.all(postVideos.map((video) => videoStorage.remove(video.file)))
      throw error
    }
  }
  // async getNewPosts(lastPostId: number) {
  //   return await Post.findMany({
  //     where: {
  //       id: { gt: lastPostId }, // Посты с ID больше последнего
  //     },
  //     orderBy: { id: 'desc' },
  //     include: {
  //       images: true,
  //       user: {
  //         select: {
  //           id: true,
  //           avatar: true,
  //           login: true,
  //         },
  //       },
  //     },
  //   });
  // }

  async remove(post_id: number, userId: number): Promise<boolean> {
    const storageService = new FileStorageService(storagePath)
    const post = await Post.findUnique({
      where: { id: post_id },
      include: { images: true, videos: true },
    })
    if (!post) throw createGraphQLError('Пост не найден')
    // Удалять можно свои посты, а на стене сообщества — любому его администратору
    if (!(await this.canManage(post, userId))) throw createGraphQLError('Нет доступа')
    // Файлы статьи нужно собрать до удаления записи: вместе с постом удалится и она
    const articleToClean = await prisma.article.findUnique({ where: { postId: post_id } })
    const filesToRemove = articleToClean ? articleFiles(articleToClean) : []
    try {
      // Видео из поста не переиспользуются, поэтому удаляем файлы вместе с записью
      if (post.videos && post.videos.length > 0) {
        const videoStorage = new VideoStorageService(storagePath)
        await Promise.all(post.videos.map((video) => videoStorage.remove(video.file)))
      }
      if (post.images && post.images.length > 0) {
        const removalPromises = post.images.map(async (item) => {
          const otherPostsWithImage = await PostImage.findMany({
            where: {
              medium: item.medium,
              postId: { not: post_id },
            },
          })
          if (otherPostsWithImage.length === 0) await storageService.removeFiles(item)
        })
        await Promise.all(removalPromises)
        await PostImage.deleteMany({
          where: { postId: post_id },
        })
      }
      // Репосты этого поста остаются, но показывают «исходный пост удалён»
      await Post.updateMany({ where: { repostOfId: post_id }, data: { repostDeleted: true } })
      await Post.delete({
        where: { id: post_id },
      })
      if (filesToRemove.length) {
        await storageService
          .removeFiles(filesToRemove)
          .catch((error) => console.error('Не удалось удалить файлы статьи', post_id, error))
      }
      return true
    } catch (error) {
      console.error('Error removing post:', error)
      throw error
    }
  }
}
export default new PostService()

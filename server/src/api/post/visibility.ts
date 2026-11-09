import prisma from '@/db/db'

import { canModerate, canViewCommunity } from '../community/access'

/**
 * Видна ли запись просматривающему. Скрыты: чужие архивные, предложенные (их видят автор и модераторы)
 * и записи закрытых сообществ для тех, кто в них не состоит.
 * Эта проверка нужна везде, где по id записи что-то читают или делают: комментарии, лайки, репосты, сохранение файлов.
 */
export const canSeePost = async (postId: number, viewerId?: number): Promise<boolean> => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { owner: true, archived: true, suggested: true, communityId: true },
  })
  if (!post) return false
  const mine = viewerId !== undefined && post.owner === viewerId
  if (post.archived && !mine) return false
  if (post.suggested && !mine && !(viewerId && post.communityId && (await canModerate(post.communityId, viewerId)))) {
    return false
  }
  return post.communityId ? await canViewCommunity(post.communityId, viewerId) : true
}

/** Условие Prisma: записи, которые просматривающий вправе видеть (для списков закладок и т.п.). */
export const visiblePostsWhere = (viewerId?: number) => ({
  suggested: false,
  OR: [
    { communityId: null },
    { community: { isClosed: false } },
    ...(viewerId ? [{ community: { members: { some: { userId: viewerId } } } }] : []),
  ],
})

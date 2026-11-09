import { createGraphQLError } from 'graphql-yoga'

import { publicUserSelect } from '@/api/user/service'
import prisma from '@/db/db'
import User from '@/db/models/user-model'

export type FriendStatus = 'NONE' | 'FRIEND' | 'SUBSCRIBED' | 'SUBSCRIBER'

const clampLimit = (limit?: number | null) => Math.min(Math.max(limit ?? 50, 1), 100)
const clampOffset = (offset?: number | null) => Math.max(offset ?? 0, 0)

class FriendService {
  private async assertUser(id: number) {
    const candidate = await User.findUnique({ where: { id }, select: { id: true } })
    if (!candidate) throw createGraphQLError('Пользователь не найден')
  }

  /**
   * Друзья — встречные подписки, подписчики — те, кто подписан, но кому не подписаны в ответ.
   * Так счётчики не дублируют друг друга, как в ВК.
   */
  private async counts(id: number) {
    const [friendsCount, subscribersCount] = await Promise.all([
      prisma.subscription.count({
        where: { followerId: id, following: { subscriptionsMade: { some: { followingId: id } } } },
      }),
      prisma.subscription.count({
        where: { followingId: id, follower: { subscriptionsReceived: { none: { followerId: id } } } },
      }),
    ])
    return { friendsCount, subscribersCount }
  }

  /** Статус отношений зрителя с профилем и публичные счётчики профиля. */
  async state(id: number, viewerId?: number) {
    await this.assertUser(id)
    const counts = await this.counts(id)
    if (!viewerId || viewerId === id) return { status: 'NONE' as FriendStatus, ...counts }

    const [forward, backward] = await Promise.all([
      prisma.subscription.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } },
      }),
      prisma.subscription.findUnique({
        where: { followerId_followingId: { followerId: id, followingId: viewerId } },
      }),
    ])

    const status: FriendStatus =
      forward && backward ? 'FRIEND' : forward ? 'SUBSCRIBED' : backward ? 'SUBSCRIBER' : 'NONE'
    return { status, ...counts }
  }

  async friends(id: number, limit?: number | null, offset?: number | null) {
    await this.assertUser(id)
    const rows = await prisma.subscription.findMany({
      where: { followerId: id, following: { subscriptionsMade: { some: { followingId: id } } } },
      orderBy: { createdAt: 'desc' },
      take: clampLimit(limit),
      skip: clampOffset(offset),
      select: { following: { select: publicUserSelect } },
    })
    return rows.map((row) => row.following)
  }

  async subscribers(id: number, limit?: number | null, offset?: number | null) {
    await this.assertUser(id)
    const rows = await prisma.subscription.findMany({
      where: { followingId: id, follower: { subscriptionsReceived: { none: { followerId: id } } } },
      orderBy: { createdAt: 'desc' },
      take: clampLimit(limit),
      skip: clampOffset(offset),
      select: { follower: { select: publicUserSelect } },
    })
    return rows.map((row) => row.follower)
  }

  async subscribe(followerId: number, followingId: number) {
    if (followerId === followingId) throw createGraphQLError('Нельзя подписаться на себя')
    await this.assertUser(followingId)
    await prisma.subscription.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    })
    return this.state(followingId, followerId)
  }

  async unsubscribe(followerId: number, followingId: number) {
    await this.assertUser(followingId)
    await prisma.subscription.deleteMany({ where: { followerId, followingId } })
    return this.state(followingId, followerId)
  }
}

export default new FriendService()

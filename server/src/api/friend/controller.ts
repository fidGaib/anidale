import { createGraphQLError } from 'graphql-yoga'

import FriendService from './service'

class FriendController {
  async state(id: number, viewerId?: number) {
    return await FriendService.state(id, viewerId)
  }
  async friends(id: number, limit?: number | null, offset?: number | null) {
    return await FriendService.friends(id, limit, offset)
  }
  async subscriptions(id: number, limit?: number | null, offset?: number | null) {
    return await FriendService.subscriptions(id, limit, offset)
  }
  async friendsOnline(id: number, limit?: number | null) {
    return await FriendService.friendsOnline(id, limit)
  }
  async subscribers(id: number, limit?: number | null, offset?: number | null) {
    return await FriendService.subscribers(id, limit, offset)
  }
  async subscribe(userId: number, viewerId?: number) {
    if (!viewerId) throw createGraphQLError('Требуется авторизация')
    return await FriendService.subscribe(viewerId, userId)
  }
  async unsubscribe(userId: number, viewerId?: number) {
    if (!viewerId) throw createGraphQLError('Требуется авторизация')
    return await FriendService.unsubscribe(viewerId, userId)
  }
}

export default new FriendController()

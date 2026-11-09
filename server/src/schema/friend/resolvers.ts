import FriendController from '@/api/friend/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { Resolvers, User } from '@/schema/resolvers-types'

const FriendResolvers: Resolvers = {
  Query: {
    async getFriends(_, { id, limit, offset }) {
      // Публичная выборка не содержит email, но GraphQL запрашивает только id/login/avatar
      return (await FriendController.friends(id, limit, offset)) as unknown as User[]
    },
    async getFriendsOnline(_, { id, limit }) {
      return (await FriendController.friendsOnline(id, limit)) as unknown as User[]
    },
    async getSubscriptions(_, { id, limit, offset }) {
      return (await FriendController.subscriptions(id, limit, offset)) as unknown as User[]
    },
    async getSubscribers(_, { id, limit, offset }) {
      return (await FriendController.subscribers(id, limit, offset)) as unknown as User[]
    },
    async getFriendState(_, { id }, { req }) {
      return await FriendController.state(id, await getOptionalUserId(req))
    },
  },
  Mutation: {
    async subscribe(_, { userId }, { req }) {
      return await FriendController.subscribe(userId, await getOptionalUserId(req))
    },
    async unsubscribe(_, { userId }, { req }) {
      return await FriendController.unsubscribe(userId, await getOptionalUserId(req))
    },
  },
}

export default FriendResolvers

import NotificationController from '@/api/notification/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const NotificationResolvers: Resolvers = {
  Query: {
    async getNotifications(_, { limit, beforeId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await NotificationController.list(user.id, limit, beforeId ?? undefined)
    },
    async unreadNotificationsCount(_, __, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await NotificationController.unreadCount(user.id)
    },
  },
  Mutation: {
    async markNotificationsRead(_, __, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await NotificationController.markAllRead(user.id)
    },
  },
}

export default NotificationResolvers

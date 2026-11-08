import MessageController from '@/api/message/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const MessageResolvers: Resolvers = {
  Query: {
    async getConversations(_, __, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.conversations(user.id)
    },
    async getMessages(_, { userId, beforeId, limit }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.list(user.id, userId, beforeId ?? undefined, limit)
    },
    async getPinnedMessage(_, { userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.getPinned(user.id, userId)
    },
  },
  Mutation: {
    async editMessage(_, { id, text }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.edit(user.id, id, text)
    },
    async deleteMessage(_, { id, forEveryone }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.deleteMessage(user.id, id, forEveryone ?? false)
    },
    async forwardMessage(_, { id, to }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.forward(user.id, id, to)
    },
    async pinMessage(_, { id, pinned }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.pin(user.id, id, pinned)
    },
    async sendMessage(_, { to, text, files, replyTo }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.send(user.id, to, text ?? undefined, files ?? undefined, replyTo ?? undefined)
    },
    async deleteConversation(_, { userId, forEveryone }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.remove(user.id, userId, forEveryone ?? false)
    },
    async markRead(_, { userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.markRead(user.id, userId)
    },
  },
}

export default MessageResolvers

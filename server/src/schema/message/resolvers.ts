import MessageController from '@/api/message/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'
import { throttle } from '@/utils/rate-limit'

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
    async getPinnedMessages(_, { userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.getPinned(user.id, userId)
    },
    async searchMessages(_, { userId, query, beforeId, limit }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.search(user.id, userId, query, beforeId ?? undefined, limit)
    },
    async getPresence(_, { userId }, { req, res }) {
      await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.presence(userId)
    },
    async getPeerRead(_, { userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.peerRead(user.id, userId)
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
    async deleteMessages(_, { ids, forEveryone }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.deleteMessages(user.id, ids, forEveryone ?? false)
    },
    async forwardMessages(_, { ids, to }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      await throttle('message', user.id)
      return await MessageController.forwardMany(user.id, ids, to)
    },
    async reactMessage(_, { id, emoji }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.react(user.id, id, emoji)
    },
    async setConversationSettings(_, { userId, muted, archived, pinned }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.setSettings(user.id, userId, { muted, archived, pinned })
    },
    async pinMessage(_, { id, pinned }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MessageController.pin(user.id, id, pinned)
    },
    async sendMessage(_, { to, text, files, replyTo }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      await throttle('message', user.id)
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

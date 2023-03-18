import { Post, PostImage } from '@/db/models/post-model'
import User from '@/db/models/user-model'

import UserDto from '../dtos/user-dto'
import ApiError from '../error/ApiError'
import fileService from './file-service'

class postService {
  async create(userId, description, likeness, next) {
    console.log(likeness)
    try {
      let files = []
      if (!likeness && description) {
        //---text
        const post = await Post.create({
          data: {
            userId: parseInt(userId),
            description,
          },
        })
        const users = []
        const user = await User.findUnique({ where: { id: post.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
        return { post: post, users }
        //---text
      } else if (likeness.size > 0) files.push(likeness)
      else files.push(...likeness)
      const post = await Post.create({
        data: {
          userId,
          description,
        },
      })
      if (files.length > 9) {
        throw ApiError.badRequest('Количество изображений не более 9.')
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validate = await fileService.validate(file, 5, 'image')
        if (validate.error) {
          await Post.delete({
            where: {
              id: post.id,
            },
          })
          throw ApiError.badRequest(validate.error)
        }
        const upload = await fileService.upload_one(file, userId, 'post', true, 800, 450)
        if (upload.error) {
          await Post.delete({
            where: {
              id: post.id,
            },
          })
          throw ApiError.badRequest(upload.error)
        }
        const postImage = await PostImage.create({
          data: {
            oversize: upload.db_min, //был oversize
            minimize: upload.db_min,
            postId: post.id,
            vertical: upload.vertical,
          },
        })
      }
      const find = await Post.findUnique({
        where: { id: post.id },
        include: { images: true },
      })
      const users = []
      const user = await User.findUnique({ where: { id: find.userId } })
      const userDto = new UserDto(user)
      users.push(userDto)
      return { post: find, users }
    } catch (e) {
      return { error: e.message }
    }
  }
  async fetchAll(limit, page) {
    try {
      if (limit < 1) return
      const posts = await Post.findMany({
        take: parseInt(limit),
        skip: parseInt(page),
        orderBy: { id: 'desc' },
        include: { images: true },
      })
      const count = await Post.count()
      const users = []
      for (const post of posts) {
        const user = await User.findUnique({ where: { id: post.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { posts, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async fetchByUser(id, limit, page) {
    const userId = parseInt(id)
    try {
      if (limit < 1) return
      const posts = await Post.findMany({
        where: { userId },
        take: parseInt(limit),
        skip: parseInt(page),
        orderBy: { id: 'desc' },
        include: { images: true },
      })
      const count = await Post.count({ where: { userId } })
      const users = []
      for (const post of posts) {
        const user = await User.findUnique({ where: { id: post.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { posts, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async remove(post_id, user_id) {
    try {
      const post = await Post.findUnique({
        where: { id: post_id },
        include: { images: true },
      })
      if (post) {
        await fileService.removePostImage(post.images)
      }
      await PostImage.deleteMany({
        where: {
          postId: post_id,
        },
      })
      await Post.delete({ where: { id: post.id } })
      return true
    } catch (e) {
      console.log(e)
    }
  }
}
export default new postService()

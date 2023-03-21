import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import { Post, PostImage } from '@/db/models/post-model'
import User from '@/db/models/user-model'

import FileStorageService from './file-service'

class PostService {
  async findAll(limit: number, page: number) {
    const posts = await Post.findMany({
      take: limit,
      skip: page,
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return posts
  }
  async findByUser(id: number, limit: number, page: number) {
    const posts = await Post.findMany({
      take: limit,
      skip: page,
      where: { userId: id },
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return posts
  }

  async create(owner: number, description: string, images?: File[]) {
    try {
      const user = await User.findUnique({ where: { id: owner } })
      if (!user) throw Error(`Пользователь '${owner}' в базе не найден`)
      const post = await Post.create({
        data: {
          userId: owner,
          description,
          feedId: user.feedId,
        },
        include: { user: true },
      })

      if (images) {
        const StorageService = new FileStorageService(storagePath)

        const imagesInfo = await Promise.all(images.map((image) => StorageService.saveImage(image)))
        await PostImage.createMany({
          data: imagesInfo.map((info) => ({
            postId: post.id,
            ...info,
          })),
        })
      }
      return post
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async remove(id: number) {
    try {
      await Post.delete({
        where: {
          id,
        },
      })
      return true
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async update(id: number, description?: string, images?: File[]) {
    try {
      const newPost = {
        description,
      }
      const post = await Post.update({ where: { id }, data: newPost, include: { user: true } })
      return post
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
}
export default new PostService()

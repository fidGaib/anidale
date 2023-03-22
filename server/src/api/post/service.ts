import { storagePath } from '@/config'
import { Post, PostImage } from '@/db/models/post-model'
import User from '@/db/models/user-model'

import FileStorageService, { SaveImage } from './file-service'

class PostService {
  async findAll(limit: number, page: number) {
    const posts = await Post.findMany({
      take: limit,
      skip: page,
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: {
          select: {
            id: true,
            avatar: true,
            login: true,
          },
        },
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
        user: {
          select: {
            id: true,
            avatar: true,
            login: true,
          },
        },
      },
    })
    return posts
  }

  async create(owner: number, description: string, images?: File[]) {
    const user = await User.findUnique({ where: { id: owner } })
    if (!user) throw Error(`Пользователь '${owner}' в базе не найден`)
    const post = await Post.create({
      data: {
        userId: owner,
        description,
        feedId: user.feedId,
      },
      include: {
        user: {
          select: {
            id: true,
            avatar: true,
            login: true,
          },
        },
      },
    })
    let postImages = <SaveImage[]>[]
    if (images?.length) {
      const StorageService = new FileStorageService(storagePath)
      postImages = await Promise.all(images.map((image) => StorageService.saveImage(image)))
      await PostImage.createMany({
        data: postImages.map((info) => ({
          postId: post.id,
          ...info,
        })),
      })
    }
    return { post, images: postImages }
  }
  async remove(id: number):Promise<boolean> {
    // file service
    const StorageService = new FileStorageService(storagePath)
    // find post
    const post = await Post.findUnique({
      where: {id},
      include: {images: true}
    })
    // some magick || iteration post images
    post?.images.forEach(async (item) => {
      // find  double image by medium
      const res = await PostImage.findMany({
        where: {
          medium: item.medium
        }
      })
      // delete image if not double || res.length === 1
      if(res.length === 1)  await StorageService.removeFile(res[0])
    })
    await PostImage.deleteMany({
      where: {postId: id}
    })
    await Post.delete({
      where: {
        id
      }
    })
    return true
  }
  async update(id: number, description?: string, images?: File[]) {
    const newPost = {
      description,
    }
    const post = await Post.update({ where: { id }, data: newPost, include: { user: true } })
    return { post, images }
  }
}
export default new PostService()

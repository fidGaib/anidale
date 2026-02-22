import { storagePath } from '@/config'
import { Post, PostImage } from '@/db/models/post-model'
import User from '@/db/models/user-model'

import FileStorageService, { SaveImage } from './file-service'
import { io } from '@/index'

class PostService {
  async findAll(limit: number, page: number) {
    const skip = page * limit
    // console.log(skip)
    const posts = await Post.findMany({
      take: limit,
      skip: skip,
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
    const skip = page * limit
    // console.log(skip)
    const posts = await Post.findMany({
      take: limit,
      skip: skip,
      where: { owner: id },
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
        owner: owner,
        description,
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
      postImages = await Promise.all(images.map((image) => StorageService.saveImage(image, 'posts/')))
      await PostImage.createMany({
        data: postImages.map((info) => ({
          postId: post.id,
          high: info.high,
          medium: info.medium,
          small: info.small,
          vertical: info.vertical,
          type: info.type,
        })),
      })
    }
    io.emit('newPost', {
      post: {
        ...post,
        images: postImages,
        user: post.user
      }
    })
    return { post, images: postImages }
  }
  async getNewPosts(lastPostId: number) {
    return await Post.findMany({
      where: {
        id: { gt: lastPostId }, // Посты с ID больше последнего
      },
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
    });
  }

  async remove(post_id: number):Promise<boolean> {
    // file service
    const StorageService = new FileStorageService(storagePath)
    // find post
    const post = await Post.findUnique({
      where: {id: post_id},
      include: {images: true}
    })
    
    // some magick || iteration post images
    if(post?.images && post?.images.length > 0) {
      post?.images.forEach(async (item) => {
        // find  double image by medium
        const res = await PostImage.findMany({
          where: {
            medium: item.medium
          },
          select: {
            small: true,
            medium: true,
            high: true,
            vertical: true,
            type: true
          }
        })
        const user = await User.findMany({ where: { avatar: item.medium }, select: { id: true }})
        if (user.length > 0) return 
        // delete image if not double || res.length === 1
        if(res.length === 1)  await StorageService.removeFile(res[0])
      })
      await PostImage.deleteMany({
        where: {postId: post_id} 
      })
    }
    await Post.delete({
      where: {
        id: post_id
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

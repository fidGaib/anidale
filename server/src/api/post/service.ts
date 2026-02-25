import { storagePath } from '@/config'
import { Post, PostImage } from '@/db/models/post-model'

import FileStorageService, { SaveImage } from './file-service'
import { io } from '@/index'
import { createGraphQLError } from 'graphql-yoga'

class PostService {
  async find(
    limit: number,
    page: number,
    userId?: number
  ){
    const skip = page * limit;
    const whereCondition = userId ? { owner: userId } : undefined;
    const posts = await Post.findMany({
      take: limit,
      skip: skip,
      where: whereCondition,
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

    return posts;
  }

  async create(owner: number, description: string, images?: File[]) {
    let postImages = <SaveImage[]>[]
    if(description && images?.length === 0) {
      const post = await Post.create({
        data: {
          owner,
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
      io.emit('newPost', {
        post: {
          ...post,
          images: postImages,
          user: post.user
        }
      })
      return { post, images: postImages }
    }
    else if (images?.length) {
      const post = await Post.create({
        data: {
          owner,
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
      const StorageService = new FileStorageService(storagePath)
      postImages = await Promise.all(images.map(async (image) => await StorageService.saveImage(image, 'posts/')))
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
      io.emit('newPost', {
        post: {
          ...post,
          images: postImages,
          user: post.user
        }
      })
      return { post, images: postImages }
    }
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

  async remove(post_id: number): Promise<boolean> {
    const storageService = new FileStorageService(storagePath);
    const post = await Post.findUnique({
      where: { id: post_id },
      include: { images: true }
    });
    if (!post) throw createGraphQLError('Пост не найден');
    try {
      if (post.images && post.images.length > 0) {
        const removalPromises = post.images.map(async (item) => {
          const otherPostsWithImage = await PostImage.findMany({
            where: {
              medium: item.medium,
              postId: { not: post_id } 
            }
          });
          if (otherPostsWithImage.length === 0) await storageService.removeFiles(item);
        });
        await Promise.all(removalPromises);
        await PostImage.deleteMany({
          where: { postId: post_id }
        });
      }
      await Post.delete({
        where: { id: post_id }
      });
      return true;
    } catch (error) {
      console.error('Error removing post:', error);
      throw error;
    }
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

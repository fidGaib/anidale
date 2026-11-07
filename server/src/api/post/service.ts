import { storagePath } from '@/config'
import { Post, PostImage } from '@/db/models/post-model'

import FileStorageService, { SaveImage } from './file-service'
// import { io } from '@/index'
import { createGraphQLError } from 'graphql-yoga'

const MAX_PAGE_LIMIT = 50

class PostService {
  async find(
    limit: number,
    page: number,
    userId?: number
  ){
    // Защита от запросов вида limit = 1000000 и отрицательных значений
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const pageNum = Math.max(Math.trunc(page) || 0, 0)
    const skip = pageNum * take;
    const whereCondition = userId ? { owner: userId } : undefined;
    const posts = await Post.findMany({
      take,
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
    const storage = new FileStorageService(storagePath)
    // Файлы сохраняем до записи в БД; если запись не удалась, удаляем их, чтобы не копить мусор
    const postImages: SaveImage[] = images?.length
      ? await Promise.all(images.map((image) => storage.saveImage(image, 'posts/')))
      : []
    try {
      // Пост и картинки создаются одним вложенным запросом, Prisma выполняет его атомарно
      const post = await Post.create({
        data: {
          owner,
          description,
          images: {
            create: postImages.map((info) => ({
              high: info.high,
              medium: info.medium,
              small: info.small,
              vertical: info.vertical,
              type: info.type,
            })),
          },
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
      return { post, images: postImages }
    } catch (error) {
      if (postImages.length) await storage.removeFiles(postImages)
      throw error
    }
  }
  // async getNewPosts(lastPostId: number) {
  //   return await Post.findMany({
  //     where: {
  //       id: { gt: lastPostId }, // Посты с ID больше последнего
  //     },
  //     orderBy: { id: 'desc' },
  //     include: {
  //       images: true,
  //       user: {
  //         select: {
  //           id: true,
  //           avatar: true,
  //           login: true,
  //         },
  //       },
  //     },
  //   });
  // }

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
}
export default new PostService()

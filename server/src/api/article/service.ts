import { createGraphQLError } from 'graphql-yoga'

import FileStorageService, { SaveImage } from '@/api/post/file-service'
import PostService from '@/api/post/service'
import { storagePath } from '@/config'
import prisma from '@/db/db'

import { canViewCommunity, isCommunityAdmin } from '../community/access'
import {
  Block,
  ParsedBlock,
  StoredImage,
  cleanTitle,
  makeExcerpt,
  parseContent,
  storedImages,
  usedFileIndexes,
} from './content'

interface ArticleInput {
  /** Опубликовать на стене сообщества (нужны права администратора). */
  communityId?: number | null
  title: string
  content: string
  cover?: File | null
  images?: File[] | null
}

interface EditInput extends ArticleInput {
  removeCover?: boolean | null
}

const ARTICLE_DIR = 'articles/'

const userSel = { select: { id: true, avatar: true, login: true } }

/** Сохраняет файлы по одному; при ошибке уже сохранённые удаляются, чтобы не копить мусор. */
const saveAll = async (storage: FileStorageService, files: File[]): Promise<SaveImage[]> => {
  const saved: SaveImage[] = []
  try {
    for (const file of files) saved.push(await storage.saveImage(file, ARTICLE_DIR))
    return saved
  } catch (error) {
    await storage.removeFiles(saved).catch(() => undefined)
    throw error
  }
}

/** Блоки в хранимом виде: номера файлов заменены путями сохранённых картинок. */
const resolveBlocks = (parsed: ParsedBlock[], saved: Map<number, SaveImage>): Block[] =>
  parsed.map((block) => {
    if (block.type !== 'image') return block
    if ('file' in block) {
      const image = saved.get(block.file)
      if (!image) throw createGraphQLError('Картинка не найдена среди загруженных файлов')
      return { type: 'image', src: image.medium, small: image.small, caption: block.caption }
    }
    return block
  })

class ArticleService {
  /** Создаёт статью вместе с постом, который её публикует. Возвращает пост в обычном виде. */
  async create(owner: number, input: ArticleInput) {
    if (input.communityId && !(await isCommunityAdmin(input.communityId, owner))) {
      throw createGraphQLError('Публиковать статьи в сообществе могут только администраторы')
    }
    const title = cleanTitle(input.title)
    const files = input.images ?? []
    const parsed = parseContent(input.content, files.length)

    const storage = new FileStorageService(storagePath)
    const used = usedFileIndexes(parsed)
    const cover = input.cover ? (await saveAll(storage, [input.cover]))[0] : null
    let savedImages: SaveImage[] = []
    try {
      savedImages = await saveAll(
        storage,
        used.map((index) => files[index]),
      )
      const byIndex = new Map(used.map((index, i) => [index, savedImages[i]]))
      const blocks = resolveBlocks(parsed, byIndex)
      const post = await prisma.post.create({
        data: {
          owner,
          communityId: input.communityId || null,
          // Название дублируется в тексте поста: так статью находит поиск по стене
          description: title,
          article: {
            create: {
              title,
              cover: cover?.medium ?? '',
              coverSmall: cover?.small ?? '',
              excerpt: makeExcerpt(blocks),
              content: JSON.stringify(blocks),
            },
          },
        },
        select: { id: true },
      })
      return await PostService.findOne(post.id, owner)
    } catch (error) {
      await storage.removeFiles([...(cover ? [cover] : []), ...savedImages]).catch(() => undefined)
      throw error
    }
  }

  /** Правка своей статьи: заголовок, обложка, содержимое. Файлы, которых больше нет в статье, удаляются. */
  async edit(userId: number, id: number, input: EditInput) {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { post: { select: { owner: true, communityId: true } } },
    })
    if (!article) throw createGraphQLError('Статья не найдена')
    // Править может автор, а статью сообщества — любой его администратор
    const { owner, communityId } = article.post
    if (owner !== userId && !(communityId && (await isCommunityAdmin(communityId, userId)))) {
      throw createGraphQLError('Нет доступа')
    }

    const title = cleanTitle(input.title)
    const files = input.images ?? []
    const previous = storedImages(article.content)
    const parsed = parseContent(input.content, files.length, previous)

    const storage = new FileStorageService(storagePath)
    const used = usedFileIndexes(parsed)
    const newCover = input.cover ? (await saveAll(storage, [input.cover]))[0] : null
    let savedImages: SaveImage[] = []
    try {
      savedImages = await saveAll(
        storage,
        used.map((index) => files[index]),
      )
      const byIndex = new Map(used.map((index, i) => [index, savedImages[i]]))
      const blocks = resolveBlocks(parsed, byIndex)
      const dropCover = Boolean(newCover || input.removeCover)
      const now = new Date()
      await prisma.$transaction([
        prisma.article.update({
          where: { id },
          data: {
            title,
            excerpt: makeExcerpt(blocks),
            content: JSON.stringify(blocks),
            editedAt: now,
            ...(dropCover ? { cover: newCover?.medium ?? '', coverSmall: newCover?.small ?? '' } : {}),
          },
        }),
        prisma.post.update({ where: { id: article.postId }, data: { description: title, editedAt: now } }),
      ])

      // Старые файлы удаляем только после успешной записи
      const kept = new Set(blocks.flatMap((block) => (block.type === 'image' ? [block.src] : [])))
      const orphans: StoredImage[] = previous.filter((image) => !kept.has(image.src))
      const oldCover = dropCover && article.cover ? [{ medium: article.cover, small: article.coverSmall }] : []
      await storage
        .removeFiles([...orphans.map((image) => ({ medium: image.src, small: image.small })), ...oldCover])
        .catch((error) => console.error('Не удалось удалить файлы статьи', id, error))
      return await PostService.findOne(article.postId, userId)
    } catch (error) {
      await storage.removeFiles([...(newCover ? [newCover] : []), ...savedImages]).catch(() => undefined)
      throw error
    }
  }

  /** Статья целиком. Архивную видит только автор. */
  async find(id: number, viewerId?: number) {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { post: { select: { owner: true, archived: true, suggested: true, communityId: true, user: userSel } } },
    })
    if (!article) return null
    if (article.post.archived && article.post.owner !== viewerId) return null
    if (article.post.suggested && article.post.owner !== viewerId) return null
    if (article.post.communityId && !(await canViewCommunity(article.post.communityId, viewerId))) return null
    return {
      id: article.id,
      title: article.title,
      cover: article.cover,
      content: article.content,
      date: article.date,
      editedAt: article.editedAt,
      postId: article.postId,
      user: article.post.user,
    }
  }
}

export default new ArticleService()

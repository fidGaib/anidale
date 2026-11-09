import { beforeEach, describe, expect, it, vi } from 'vitest'

import ArticleController from '@/api/article/controller'
import PostService from '@/api/post/service'

import { createPost, createUsers, eventsOf, prisma, resetDb } from './helpers'

// Нативную обработку картинок заменяем заглушкой: она запоминает, что сохраняли и что удаляли
const storage = vi.hoisted(() => ({ saved: [] as string[], removed: [] as string[] }))
vi.mock('@/api/post/file-service', () => {
  let n = 0
  class FileStorageService {
    async saveImage() {
      n += 1
      const medium = `articles/aa/img${n}`
      storage.saved.push(medium)
      return { high: '', medium, small: `${medium}-s`, vertical: false, type: 'webp' }
    }
    async removeFiles(images: unknown) {
      const list = Array.isArray(images) ? images : [images]
      for (const image of list) storage.removed.push((image as { medium: string }).medium)
      return true
    }
  }
  return { default: FileStorageService }
})

type User = Awaited<ReturnType<typeof createUsers>>[number]

const file = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })
const blocks = (list: unknown) => JSON.stringify(list)

let author: User
let other: User

beforeEach(async () => {
  await resetDb()
  storage.saved.length = 0
  storage.removed.length = 0
  ;[author, other] = await createUsers(2)
})

describe('статьи: создание', () => {
  it('создаёт пост-статью с карточкой, текстом поста из заголовка и событием newPost', async () => {
    const post = await ArticleController.create(author.id, {
      title: '  Моя   статья ',
      content: blocks([
        { type: 'h', text: 'Глава' },
        { type: 'p', text: 'Первый абзац' },
      ]),
    })
    expect(post).toMatchObject({
      description: 'Моя статья',
      article: { title: 'Моя статья', excerpt: 'Первый абзац', cover: '' },
    })
    expect(eventsOf('newPost')).toHaveLength(1)
  })

  it('сохраняет обложку и только использованные картинки', async () => {
    const post = await ArticleController.create(author.id, {
      title: 'С картинками',
      content: blocks([
        { type: 'p', text: 'Текст' },
        { type: 'image', file: 1, caption: 'Вторая' },
      ]),
      cover: file('cover.jpg'),
      images: [file('0.jpg'), file('1.jpg')],
    })
    // Обложка и одна картинка: нулевой файл в тексте не используется и не сохраняется
    expect(storage.saved).toHaveLength(2)
    expect(post?.article?.cover).toBe(storage.saved[0])
    const saved = await prisma.article.findFirst()
    expect(JSON.parse(saved?.content ?? '[]')[1]).toMatchObject({
      type: 'image',
      src: storage.saved[1],
      caption: 'Вторая',
    })
  })

  it('пустой заголовок или пустая статья отклоняются и ничего не сохраняют', async () => {
    await expect(
      ArticleController.create(author.id, { title: ' ', content: blocks([{ type: 'p', text: 'a' }]) }),
    ).rejects.toThrow('заголовок')
    await expect(
      ArticleController.create(author.id, { title: 'Т', content: blocks([{ type: 'p', text: ' ' }]) }),
    ).rejects.toThrow('пуста')
    expect(await prisma.article.count()).toBe(0)
    expect(await prisma.post.count()).toBe(0)
    expect(storage.saved).toEqual([])
  })
})

describe('статьи: чтение', () => {
  it('статью видят все, архивную — только автор', async () => {
    const post = await ArticleController.create(author.id, {
      title: 'Т',
      content: blocks([{ type: 'p', text: 'текст' }]),
    })
    const id = post?.article?.id ?? 0
    expect(await ArticleController.find(id, other.id)).toMatchObject({ title: 'Т', postId: post?.id })
    expect(await ArticleController.find(id, undefined)).not.toBeNull()

    await prisma.post.update({ where: { id: post?.id }, data: { archived: true } })
    expect(await ArticleController.find(id, other.id)).toBeNull()
    expect(await ArticleController.find(id, author.id)).not.toBeNull()
    expect(await ArticleController.find(9999, author.id)).toBeNull()
  })

  it('карточка статьи приходит в стене и ленте', async () => {
    await ArticleController.create(author.id, { title: 'Т', content: blocks([{ type: 'p', text: 'текст' }]) })
    const wall = await PostService.find(10, 0, author.id, other.id)
    expect(wall[0].article).toMatchObject({ title: 'Т', excerpt: 'текст' })
  })
})

describe('статьи: правка', () => {
  const make = () =>
    ArticleController.create(author.id, {
      title: 'Старый',
      content: blocks([
        { type: 'p', text: 'старый текст' },
        { type: 'image', file: 0 },
      ]),
      cover: file('c.jpg'),
      images: [file('0.jpg')],
    })

  it('меняет заголовок, текст и помечает пост изменённым', async () => {
    const post = await make()
    const id = post?.article?.id ?? 0
    const kept = storage.saved[1]
    const updated = await ArticleController.edit(author.id, id, {
      title: 'Новый',
      content: blocks([
        { type: 'p', text: 'новый текст' },
        { type: 'image', src: kept },
      ]),
    })
    expect(updated).toMatchObject({ description: 'Новый', article: { title: 'Новый', excerpt: 'новый текст' } })
    expect(updated?.editedAt).not.toBeNull()
    // Картинка осталась в тексте — файл не трогаем; обложка не менялась
    expect(storage.removed).toEqual([])
  })

  it('удаляет файлы убранных картинок и старой обложки', async () => {
    const post = await make()
    const id = post?.article?.id ?? 0
    const [cover, image] = storage.saved
    await ArticleController.edit(author.id, id, {
      title: 'Без картинки',
      content: blocks([{ type: 'p', text: 'только текст' }]),
      removeCover: true,
    })
    expect(storage.removed.sort()).toEqual([cover, image].sort())
    expect((await prisma.article.findUnique({ where: { id } }))?.cover).toBe('')
  })

  it('чужую статью править нельзя, картинку из чужой статьи подставить нельзя', async () => {
    const post = await make()
    const id = post?.article?.id ?? 0
    await expect(
      ArticleController.edit(other.id, id, { title: 'Взлом', content: blocks([{ type: 'p', text: 'x' }]) }),
    ).rejects.toThrow('Нет доступа')
    await expect(
      ArticleController.edit(author.id, id, {
        title: 'Т',
        content: blocks([{ type: 'image', src: 'avatars/чужая' }]),
      }),
    ).rejects.toThrow('не найдена в статье')
    await expect(
      ArticleController.edit(author.id, 9999, { title: 'Т', content: blocks([{ type: 'p', text: 'x' }]) }),
    ).rejects.toThrow('не найдена')
  })
})

describe('статьи и посты', () => {
  it('текст поста-статьи обычной правкой поста менять нельзя', async () => {
    const post = await ArticleController.create(author.id, { title: 'Т', content: blocks([{ type: 'p', text: 'x' }]) })
    await expect(PostService.edit(author.id, post?.id ?? 0, 'другое')).rejects.toThrow('редакторе')
    // Обычный пост правится как раньше
    const plain = await createPost(author.id, 'обычный')
    expect((await PostService.edit(author.id, plain.id, 'исправлено'))?.description).toBe('исправлено')
  })

  it('удаление поста удаляет статью и её файлы', async () => {
    const post = await ArticleController.create(author.id, {
      title: 'Т',
      content: blocks([{ type: 'image', file: 0 }]),
      cover: file('c.jpg'),
      images: [file('0.jpg')],
    })
    const [cover, image] = storage.saved
    expect(await PostService.remove(post?.id ?? 0, author.id)).toBe(true)
    expect(await prisma.article.count()).toBe(0)
    expect(storage.removed.sort()).toEqual([cover, image].sort())
  })
})

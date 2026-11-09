import prisma from '@/db/db'
import * as index from '@/index'

import { assertTestDatabase } from './test-db'

type EmittedEvent = { rooms: string[]; event: string; payload: unknown }

/** События сокета, отправленные с начала теста (заглушка из setup.ts). */
export const emitted = () => (index as unknown as { __events: EmittedEvent[] }).__events

/** События с именем `name`, отправленные в комнату `room` (если указана). */
export const eventsOf = (name: string, room?: string) =>
  emitted().filter((e) => e.event === name && (!room || e.rooms.includes(room)))

/** Очищает все таблицы тестовой базы и счётчики id. Перед каждым тестом. */
export const resetDb = async () => {
  assertTestDatabase()
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  const names = tables.map((t) => `"${t.tablename}"`).join(', ')
  if (names) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
  emitted().length = 0
}

let counter = 0

/** Пользователь с уникальной почтой. */
export const createUser = async (login = `user${++counter}`) =>
  prisma.user.create({
    data: { email: `${login}-${++counter}@test.local`, pass: 'x', login, avatar: '', isActivated: true },
  })

/** Несколько пользователей сразу. */
export const createUsers = async (count: number) => {
  const users = []
  for (let i = 0; i < count; i++) users.push(await createUser(`u${i + 1}`))
  return users
}

/** Пост без файлов: прямой записью в БД, минуя загрузку картинок. */
export const createPost = async (owner: number, description = 'текст', extra: Record<string, unknown> = {}) =>
  prisma.post.create({ data: { owner, description, ...extra } })

/** Картинка поста: запись в БД без реального файла. */
export const createPostImage = async (postId: number) =>
  prisma.postImage.create({
    data: {
      postId,
      high: '',
      medium: `posts/m-${++counter}`,
      small: `posts/s-${counter}`,
      type: 'webp',
      vertical: false,
    },
  })

/** Видео поста или отдельное видео: запись в БД без реального файла. */
export const createVideo = async (ownerId: number, postId: number | null = null, title = 'ролик') =>
  prisma.video.create({
    data: { ownerId, postId, title, file: `videos/${++counter}.mp4`, size: 100, type: 'video/mp4' },
  })

export { prisma }

import { buildSchema, parse, validate } from 'graphql'
import http from 'http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityService from '@/api/community/service'
import PostController from '@/api/post/controller'
import PostService from '@/api/post/service'
import ReactionController from '@/api/reaction/controller'
import tokenService from '@/api/user/token-service'
import { serveStatic } from '@/handlers/file-upload'
import { depthLimit, selectionDepth } from '@/schema/depth-limit'
import { POLICIES, clientIp, hit, resetLimit, throttle } from '@/utils/rate-limit'

import { createUsers, eventsOf, prisma, resetDb } from './helpers'

vi.mock('@/api/post/file-service', () => ({
  default: class {
    async saveImage() {
      return { high: '', medium: 'x/a/b', small: 'x/a/b-s', vertical: false, type: 'webp' }
    }
    async removeFiles() {
      return true
    }
  },
}))

type User = Awaited<ReturnType<typeof createUsers>>[number]
let owner: User
let member: User
let stranger: User

beforeEach(async () => {
  await resetDb()
  ;[owner, member, stranger] = await createUsers(3)
})

describe('доступ к записям по id: комментарии, лайки, репосты', () => {
  const secretPost = async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    await CommunityService.join(member.id, closed.id)
    await CommunityService.resolveRequest(owner.id, closed.id, member.id, true)
    const post = await PostService.create(owner.id, 'секрет', [], [], closed.id)
    await ReactionController.addComment(post.post.id, member.id, 'свой комментарий')
    return { closed, id: post.post.id }
  }

  it('комментарии записи закрытого сообщества читают только участники', async () => {
    const { id } = await secretPost()
    expect(await ReactionController.getComments(id, 10, 0, member.id)).toHaveLength(1)
    expect(await ReactionController.getComments(id, 10, 0, stranger.id)).toEqual([])
    expect(await ReactionController.getComments(id, 10, 0, undefined)).toEqual([])
  })

  it('посторонний не может комментировать, лайкать и репостить запись закрытого сообщества', async () => {
    const { id } = await secretPost()
    await expect(ReactionController.addComment(id, stranger.id, 'привет')).rejects.toThrow('Пост не найден')
    await expect(ReactionController.setLike(id, stranger.id, true)).rejects.toThrow('Пост не найден')
    await expect(PostService.repost(stranger.id, id, 'моё')).rejects.toThrow('Пост не найден')
    expect(await prisma.comment.count({ where: { userId: stranger.id } })).toBe(0)
    expect(await prisma.like.count({ where: { userId: stranger.id } })).toBe(0)
    // Участник всё это может
    expect((await ReactionController.setLike(id, member.id, true)).liked).toBe(true)
  })

  it('чужой архивный пост и предложка скрыты для комментариев и лайков', async () => {
    const open = await CommunityService.create(owner.id, { name: 'Открытое' })
    await CommunityService.join(member.id, open.id)
    const suggested = await PostService.create(member.id, 'предлагаю', [], [], open.id)
    await expect(ReactionController.addComment(suggested.post.id, stranger.id, 'x')).rejects.toThrow('Пост не найден')
    expect(await ReactionController.getComments(suggested.post.id, 10, 0, stranger.id)).toEqual([])
    // Автору и модератору предложка доступна
    expect(await ReactionController.addComment(suggested.post.id, member.id, 'мой')).toBeTruthy()
    expect(await ReactionController.addComment(suggested.post.id, owner.id, 'ответ')).toBeTruthy()

    const personal = await prisma.post.create({ data: { owner: owner.id, description: 'личный', archived: true } })
    await expect(ReactionController.setLike(personal.id, stranger.id, true)).rejects.toThrow('Пост не найден')
    expect((await ReactionController.setLike(personal.id, owner.id, true)).liked).toBe(true)
  })

  it('закладки не показывают записи сообщества, в котором человека больше нет', async () => {
    const { closed, id } = await secretPost()
    await PostService.bookmark(member.id, id, true)
    expect((await PostService.findBookmarked(member.id, 10, 0)).map((p) => p.id)).toEqual([id])
    await CommunityService.leave(member.id, closed.id)
    expect(await PostService.findBookmarked(member.id, 10, 0)).toEqual([])
  })

  it('просмотры записей закрытого сообщества у постороннего не считаются', async () => {
    const { id } = await secretPost()
    expect(await PostService.view(stranger.id, [id])).toEqual([])
    expect((await prisma.post.findUnique({ where: { id } }))?.views).toBe(0)
  })
})

describe('рассылка новых записей по сокету', () => {
  it('запись закрытого сообщества никому не рассылается, открытого — рассылается', async () => {
    const closed = await CommunityService.create(owner.id, { name: 'Закрытое', isClosed: true })
    const open = await CommunityService.create(owner.id, { name: 'Открытое' })
    await PostController.create(owner.id, 'тайная', [], [], closed.id)
    expect(eventsOf('newPost')).toHaveLength(0)
    await PostController.create(owner.id, 'публичная', [], [], open.id)
    await PostController.create(owner.id, 'личная')
    expect(eventsOf('newPost')).toHaveLength(2)
  })
})

describe('ограничитель частоты', () => {
  const T0 = new Date('2030-01-01T00:00:00Z')
  const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000)

  it('пропускает не больше лимита за окно, потом снова разрешает', async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push((await hit('k', 3, 1000, T0)).allowed)
    expect(results).toEqual([true, true, true, false])
    expect((await hit('k', 3, 1000, T0)).retryAfter).toBe(1)
    expect((await hit('другой', 3, 1000, T0)).allowed).toBe(true)
    // Окно закончилось: счётчик начинается заново
    expect((await hit('k', 3, 1000, at(2))).allowed).toBe(true)
  })

  it('счётчик в запасной таблице (Redis выключен): переживает перезапуск процесса', async () => {
    await hit('persist', 1, 60_000, T0)
    expect(await prisma.rateLimit.findUnique({ where: { key: 'persist' } })).toMatchObject({ count: 1 })
    expect((await hit('persist', 1, 60_000, at(1))).allowed).toBe(false)
  })

  it('параллельные обращения не обгоняют друг друга', async () => {
    const all = await Promise.all(Array.from({ length: 10 }, () => hit('race', 3, 60_000, T0)))
    expect(all.filter((r) => r.allowed)).toHaveLength(3)
  })

  it('throttle бросает понятную ошибку по таблице лимитов, resetLimit сбрасывает', async () => {
    for (let i = 0; i < POLICIES.comment.max; i++) await throttle('comment', 7)
    await expect(throttle('comment', 7)).rejects.toThrow(/комментируете слишком часто\. Попробуйте через \d+ (с|мин)\./)
    // У другого человека лимит свой
    await expect(throttle('comment', 8)).resolves.toBeUndefined()
    await resetLimit('comment', 7)
    await expect(throttle('comment', 7)).resolves.toBeUndefined()
  })

  it('вход ограничен по почте и по адресу независимо', async () => {
    for (let i = 0; i < POLICIES.login.max; i++) await throttle('login', '1.1.1.1:a@a.ru')
    await expect(throttle('login', '1.1.1.1:a@a.ru')).rejects.toThrow('неудачных попыток входа')
    await expect(throttle('login', '1.1.1.1:b@b.ru')).resolves.toBeUndefined()
  })

  it('адрес клиента: заголовку прокси верим только при TRUST_PROXY', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } }
    expect(clientIp(req)).toBe('9.9.9.9')
    process.env.TRUST_PROXY = '1'
    expect(clientIp(req)).toBe('1.2.3.4')
    delete process.env.TRUST_PROXY
  })
})

describe('глубина запросов GraphQL', () => {
  const schema = buildSchema('type U { id: Int friends: [U!]! } type Query { me: U }')
  const errorsFor = (query: string, max: number) => validate(schema, parse(query), [depthLimit(max)])

  it('обычный запрос проходит, слишком глубокий отклоняется', () => {
    expect(errorsFor('{ me { id friends { id } } }', 3)).toEqual([])
    const deep = errorsFor('{ me { friends { friends { friends { id } } } } }', 3)
    expect(deep).toHaveLength(1)
    expect(deep[0].message).toContain('слишком глубокий')
  })

  it('глубину через фрагменты не обойти', () => {
    const query =
      'query { me { ...A } } fragment A on U { friends { ...B } } fragment B on U { friends { friends { id } } }'
    expect(errorsFor(query, 3)).toHaveLength(1)
    expect(errorsFor(query, 5)).toEqual([])
  })

  it('поля интроспекции в глубину не считаются, циклы фрагментов не зацикливают подсчёт', () => {
    expect(errorsFor('{ __schema { types { fields { type { ofType { name } } } } } }', 2)).toEqual([])
    const doc = parse('query { me { ...A } } fragment A on U { friends { ...A } }')
    const fragments = new Map(
      doc.definitions.flatMap((d) => (d.kind === 'FragmentDefinition' ? [[d.name.value, d] as const] : [])),
    )
    const op = doc.definitions.find((d) => d.kind === 'OperationDefinition')
    expect(selectionDepth(op && 'selectionSet' in op ? op.selectionSet : undefined, fragments)).toBeGreaterThan(0)
  })
})

describe('куки и раздача файлов', () => {
  it('куки по умолчанию с SameSite=Lax, а в продакшене ещё и Secure', () => {
    const header = (env: string | undefined) => {
      const before = process.env.NODE_ENV
      process.env.NODE_ENV = env
      const headers: Record<string, unknown> = {}
      const res = { getHeader: (n: string) => headers[n], setHeader: (n: string, v: unknown) => (headers[n] = v) }
      tokenService.setCookie(res as unknown as http.ServerResponse, 'a', 'b', { httpOnly: true })
      process.env.NODE_ENV = before
      return (headers['Set-Cookie'] as string[])[0]
    }
    expect(header('development')).toContain('SameSite=Lax')
    expect(header('development')).not.toContain('Secure')
    expect(header('production')).toMatch(/Secure/)
    expect(header('production')).toContain('HttpOnly')
  })

  it('адреса с «..» не выводят за каталог хранилища и не отдают файлы сразу', () => {
    const run = (url: string) => {
      let status = 0
      const res = { writeHead: (code: number) => (status = code), end: () => undefined }
      const handled = serveStatic({ url, headers: {} } as http.IncomingMessage, res as unknown as http.ServerResponse)
      return { handled, status }
    }
    // Адрес нормализуется до разбора, поэтому «..» схлопывается; чужие пути хранилище не обслуживает
    for (const url of ['/storage/../storage-secret/key.txt', '/storage/../../.env', '/storage/%2e%2e/%2e%2e/.env']) {
      const { handled, status } = run(url)
      expect(status === 0 || status === 403 || !handled).toBe(true)
    }
    expect(run('/feed').handled).toBe(false)
  })
})

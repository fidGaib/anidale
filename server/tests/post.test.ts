import { beforeEach, describe, expect, it } from 'vitest'

import PostController from '@/api/post/controller'
import PostService from '@/api/post/service'

import { createPost, createPostImage, createUsers, createVideo, prisma, resetDb } from './helpers'

describe('посты: действия автора', () => {
  let owner: Awaited<ReturnType<typeof createUsers>>[number]
  let other: typeof owner

  beforeEach(async () => {
    await resetDb()
    ;[owner, other] = await createUsers(2)
  })

  it('править текст может только автор, и пост получает отметку «изменено»', async () => {
    const post = await createPost(owner.id, 'старый')
    await expect(PostService.edit(other.id, post.id, 'чужой')).rejects.toThrow('Нет доступа')

    const edited = await PostService.edit(owner.id, post.id, '  новый текст  ')
    expect(edited?.description).toBe('новый текст')
    expect(edited?.editedAt).toBeInstanceOf(Date)
  })

  it('нельзя сделать пустым пост без картинок, видео и репоста', async () => {
    const empty = await createPost(owner.id, 'текст')
    await expect(PostService.edit(owner.id, empty.id, '   ')).rejects.toThrow('Пост не может быть пустым')

    const withImage = await createPost(owner.id, 'с картинкой')
    await createPostImage(withImage.id)
    const edited = await PostService.edit(owner.id, withImage.id, '')
    expect(edited?.description).toBe('')
  })

  it('закрепить можно один пост: новый закреп снимает прежний', async () => {
    const first = await createPost(owner.id, 'первый')
    const second = await createPost(owner.id, 'второй')
    await PostService.pin(owner.id, first.id, true)
    await PostService.pin(owner.id, second.id, true)

    const pinned = await prisma.post.findMany({ where: { pinned: true } })
    expect(pinned.map((p) => p.id)).toEqual([second.id])
    await expect(PostService.pin(other.id, second.id, false)).rejects.toThrow('Нет доступа')
  })

  it('закреплённый пост идёт первым на странице автора, остальные по убыванию id', async () => {
    const a = await createPost(owner.id, 'a')
    const b = await createPost(owner.id, 'b')
    const c = await createPost(owner.id, 'c')
    await PostService.pin(owner.id, a.id, true)

    const profile = await PostService.find(10, 0, owner.id, other.id)
    expect(profile.map((p) => p.id)).toEqual([a.id, c.id, b.id])
  })

  it('пост в архиве нельзя закрепить, а архивирование снимает закреп', async () => {
    const post = await createPost(owner.id, 'пост')
    await PostService.pin(owner.id, post.id, true)
    await PostService.archive(owner.id, post.id, true)
    expect((await prisma.post.findUnique({ where: { id: post.id } }))?.pinned).toBe(false)
    await expect(PostService.pin(owner.id, post.id, true)).rejects.toThrow('Пост в архиве')
  })
})

describe('посты: видимость и архив', () => {
  let owner: Awaited<ReturnType<typeof createUsers>>[number]
  let other: typeof owner

  beforeEach(async () => {
    await resetDb()
    ;[owner, other] = await createUsers(2)
  })

  it('архивный пост не попадает ни в ленту, ни на «Главную», даже автору, и недоступен по ссылке чужим', async () => {
    const open = await createPost(owner.id, 'открытый')
    const hidden = await createPost(owner.id, 'скрытый', { archived: true })

    expect((await PostService.find(10, 0, owner.id, owner.id)).map((p) => p.id)).toEqual([open.id])
    expect((await PostService.find(10, 0, owner.id, other.id)).map((p) => p.id)).toEqual([open.id])
    expect((await PostService.find(10, 0, undefined, owner.id)).map((p) => p.id)).toEqual([open.id])

    expect(await PostService.findOne(hidden.id, other.id)).toBeNull()
    expect((await PostService.findOne(hidden.id, owner.id))?.id).toBe(hidden.id)
  })

  it('вкладка «Архив»: только архивные посты и только для самого автора', async () => {
    await createPost(owner.id, 'открытый')
    const hidden = await createPost(owner.id, 'скрытый', { archived: true })

    expect((await PostService.find(10, 0, owner.id, owner.id, undefined, 'archive')).map((p) => p.id)).toEqual([
      hidden.id,
    ])
    // Чужому и гостю архив не показывается и не подтверждает своё существование
    expect(await PostService.find(10, 0, owner.id, other.id, undefined, 'archive')).toEqual([])
    expect(await PostService.find(10, 0, owner.id, undefined, undefined, 'archive')).toEqual([])
    // В общей ленте вида «архив» не бывает
    expect(await PostService.find(10, 0, undefined, owner.id, undefined, 'archive')).toEqual([])
  })

  it('вкладка «Мои посты»: без репостов', async () => {
    const own = await createPost(owner.id, 'свой')
    const source = await createPost(other.id, 'чужой')
    const repost = await createPost(owner.id, 'репост', { repostOfId: source.id })

    const all = await PostService.find(10, 0, owner.id, other.id, undefined, 'all')
    expect(all.map((p) => p.id).sort()).toEqual([own.id, repost.id].sort())
    const mine = await PostService.find(10, 0, owner.id, other.id, undefined, 'own')
    expect(mine.map((p) => p.id)).toEqual([own.id])
  })

  it('поиск работает внутри выбранной вкладки и страницы автора', async () => {
    const wanted = await createPost(owner.id, 'Кофе по утрам')
    await createPost(owner.id, 'чай')
    await createPost(other.id, 'кофе у другого')
    const hiddenCoffee = await createPost(owner.id, 'старый КОФЕ', { archived: true })

    expect((await PostService.find(10, 0, owner.id, owner.id, 'кофе')).map((p) => p.id)).toEqual([wanted.id])
    expect((await PostService.find(10, 0, owner.id, owner.id, 'кофе', 'archive')).map((p) => p.id)).toEqual([
      hiddenCoffee.id,
    ])
    expect(await PostService.find(10, 0, owner.id, owner.id, 'ничего')).toEqual([])
  })

  it('закреплённый пост идёт первым на любой вкладке, где он есть', async () => {
    const a = await createPost(owner.id, 'a')
    const b = await createPost(owner.id, 'b')
    await PostService.pin(owner.id, a.id, true)
    expect((await PostService.find(10, 0, owner.id, owner.id, undefined, 'own')).map((p) => p.id)).toEqual([a.id, b.id])
  })

  it('поиск по тексту не учитывает регистр', async () => {
    await createPost(owner.id, 'Привет, МИР')
    await createPost(owner.id, 'другое')
    const found = await PostService.find(10, 0, undefined, undefined, 'мир')
    expect(found.map((p) => p.description)).toEqual(['Привет, МИР'])
  })
})

describe('посты: закладки, жалобы, просмотры', () => {
  let owner: Awaited<ReturnType<typeof createUsers>>[number]
  let viewer: typeof owner

  beforeEach(async () => {
    await resetDb()
    ;[owner, viewer] = await createUsers(2)
  })

  it('закладку можно поставить и снять, посты в закладках идут новыми сверху', async () => {
    const first = await createPost(owner.id, 'раньше')
    const second = await createPost(owner.id, 'позже')
    await PostService.bookmark(viewer.id, first.id, true)
    await PostService.bookmark(viewer.id, second.id, true)
    await PostService.bookmark(viewer.id, second.id, true) // повтор безопасен

    const list = await PostService.findBookmarked(viewer.id, 10, 0)
    expect(list.map((p) => p.id)).toEqual([second.id, first.id])
    expect(list.every((p) => p.bookmarked)).toBe(true)

    await PostService.bookmark(viewer.id, first.id, false)
    expect((await PostService.findBookmarked(viewer.id, 10, 0)).map((p) => p.id)).toEqual([second.id])
  })

  it('в закладки нельзя добавить несуществующий пост и чужой архивный', async () => {
    await expect(PostService.bookmark(viewer.id, 9999, true)).rejects.toThrow('Пост не найден')
    const hidden = await createPost(owner.id, 'скрыт', { archived: true })
    await expect(PostService.bookmark(viewer.id, hidden.id, true)).rejects.toThrow('Пост не найден')
  })

  it('жалоба: причина из списка, на свой пост нельзя, повтор не плодит записи', async () => {
    const post = await createPost(owner.id, 'пост')
    await expect(PostService.report(viewer.id, post.id, 'выдуманная')).rejects.toThrow('Выберите причину')
    await expect(PostService.report(owner.id, post.id, 'spam')).rejects.toThrow('Нельзя пожаловаться на свой пост')

    await PostService.report(viewer.id, post.id, 'spam')
    await PostService.report(viewer.id, post.id, 'abuse')
    const reports = await prisma.postReport.findMany()
    expect(reports).toHaveLength(1)
    expect(reports[0].reason).toBe('abuse')
  })

  it('просмотры: один человек даёт посту не больше одного просмотра, сколько бы раз ни открывал', async () => {
    const post = await createPost(owner.id, 'a')
    for (let i = 0; i < 5; i++) await PostService.view(viewer.id, [post.id])
    expect((await prisma.post.findUnique({ where: { id: post.id } }))?.views).toBe(1)
    expect(await prisma.postView.count()).toBe(1)
  })

  it('просмотры разных людей складываются', async () => {
    const post = await createPost(owner.id, 'a')
    const third = (await createUsers(1))[0]
    await PostService.view(viewer.id, [post.id])
    const result = await PostService.view(third.id, [post.id])
    expect(result).toEqual([{ id: post.id, views: 2 }])
  })

  it('автор свои просмотры не накручивает, а ответ всё равно содержит актуальный счётчик', async () => {
    const post = await createPost(owner.id, 'a')
    await PostService.view(viewer.id, [post.id])
    const result = await PostService.view(owner.id, [post.id])
    expect(result).toEqual([{ id: post.id, views: 1 }])
    expect(await prisma.postView.count({ where: { userId: owner.id } })).toBe(0)
  })

  it('просмотры: дубли в списке не считаются, архивные и несуществующие посты пропускаются', async () => {
    const open = await createPost(owner.id, 'a')
    const archived = await createPost(owner.id, 'b', { archived: true })
    const result = await PostService.view(viewer.id, [open.id, open.id, archived.id, 9999])
    expect(result).toEqual([{ id: open.id, views: 1 }])
    expect((await prisma.post.findUnique({ where: { id: archived.id } }))?.views).toBe(0)
  })

  it('просмотры за один вызов нескольких постов, не больше 50 за раз', async () => {
    const posts = []
    for (let i = 0; i < 55; i++) posts.push(await createPost(owner.id, `п${i}`))
    const result = await PostService.view(
      viewer.id,
      posts.map((p) => p.id),
    )
    expect(result).toHaveLength(50)
    expect(await prisma.postView.count()).toBe(50)
  })

  it('удаление поста убирает его просмотры, а удаление зрителя — не меняет счётчик поста', async () => {
    const post = await createPost(owner.id, 'a')
    await PostService.view(viewer.id, [post.id])
    await prisma.user.delete({ where: { id: viewer.id } })
    expect((await prisma.post.findUnique({ where: { id: post.id } }))?.views).toBe(1)
    await prisma.post.delete({ where: { id: post.id } })
    expect(await prisma.postView.count()).toBe(0)
  })
})

describe('посты: репосты', () => {
  let author: Awaited<ReturnType<typeof createUsers>>[number]
  let fan: typeof author

  beforeEach(async () => {
    await resetDb()
    ;[author, fan] = await createUsers(2)
  })

  it('репост ссылается на исходный пост, а репост репоста — на самый первый', async () => {
    const original = await createPost(author.id, 'оригинал')
    const first = await PostService.repost(fan.id, original.id, 'смотрите')
    expect(first.rootOwner).toBe(author.id)
    expect(first.post?.repostOfId).toBe(original.id)
    expect(first.post?.description).toBe('смотрите')

    const second = await PostService.repost(author.id, first.post?.id as number)
    expect(second.post?.repostOfId).toBe(original.id)
    expect((await PostService.findOne(original.id))?.repostsCount).toBe(2)
  })

  it('после удаления оригинала репост остаётся и помечается «исходный пост удалён»', async () => {
    const original = await createPost(author.id, 'оригинал')
    const { post } = await PostService.repost(fan.id, original.id)
    await PostService.remove(original.id, author.id)

    const repost = await prisma.post.findUnique({ where: { id: post?.id } })
    expect(repost?.repostOfId).toBeNull()
    expect(repost?.repostDeleted).toBe(true)
    await expect(PostService.repost(author.id, post?.id as number)).rejects.toThrow('Исходный пост удалён')
  })

  it('удалить чужой пост нельзя', async () => {
    const post = await createPost(author.id, 'мой')
    await expect(PostService.remove(post.id, fan.id)).rejects.toThrow('Нет доступа')
  })

  it('репостить архивный пост другого автора нельзя', async () => {
    const hidden = await createPost(author.id, 'скрыт', { archived: true })
    await expect(PostService.repost(fan.id, hidden.id)).rejects.toThrow('Пост не найден')
  })
})

describe('посты: признак «сохранено» у картинок и видео', () => {
  let author: Awaited<ReturnType<typeof createUsers>>[number]
  let viewer: typeof author

  beforeEach(async () => {
    await resetDb()
    ;[author, viewer] = await createUsers(2)
  })

  it('картинки и видео помечаются saved только для того, кто их сохранил', async () => {
    const post = await createPost(author.id, 'с медиа')
    const image = await createPostImage(post.id)
    const video = await createVideo(author.id, post.id)
    await prisma.savedPhoto.create({ data: { userId: viewer.id, postImageId: image.id } })

    const asViewer = await PostService.findOne(post.id, viewer.id)
    expect(asViewer?.images[0]).toMatchObject({ id: image.id, saved: true })
    expect(asViewer?.videos[0]).toMatchObject({ id: video.id, saved: false })

    await prisma.savedVideo.create({ data: { userId: viewer.id, videoId: video.id } })
    const again = await PostService.findOne(post.id, viewer.id)
    expect(again?.videos[0]).toMatchObject({ saved: true })

    // Для гостя и для автора отметок нет
    const asGuest = await PostService.findOne(post.id)
    expect((asGuest?.images[0] as { saved?: boolean } | undefined)?.saved).toBeFalsy()
    const asAuthor = await PostService.findOne(post.id, author.id)
    expect(asAuthor?.images[0]).toMatchObject({ saved: false })
  })

  it('те же отметки есть в ленте и на странице автора', async () => {
    const post = await createPost(author.id, 'с картинкой')
    const image = await createPostImage(post.id)
    await prisma.savedPhoto.create({ data: { userId: viewer.id, postImageId: image.id } })

    const feed = await PostService.find(10, 0, undefined, viewer.id)
    expect(feed[0].images[0]).toMatchObject({ id: image.id, saved: true })
    const profile = await PostService.find(10, 0, author.id, viewer.id)
    expect(profile[0].images[0]).toMatchObject({ id: image.id, saved: true })
  })
})

describe('посты: запрос стены через контроллер', () => {
  let owner: Awaited<ReturnType<typeof createUsers>>[number]

  beforeEach(async () => {
    await resetDb()
    ;[owner] = await createUsers(1)
  })

  it('неизвестный вид стены работает как «Главная», архив туда не попадает', async () => {
    const open = await createPost(owner.id, 'открытый')
    await createPost(owner.id, 'скрытый', { archived: true })
    const result = await PostController.getPostsByUser(owner.id, 10, 0, owner.id, undefined, 'что-то-левое')
    expect(result.map((p) => p.id)).toEqual([open.id])
  })

  it('пустой и пробельный поиск не фильтрует, слишком длинный обрезается', async () => {
    await createPost(owner.id, 'пост')
    expect(await PostController.getPostsByUser(owner.id, 10, 0, owner.id, '   ', 'all')).toHaveLength(1)
    const long = 'я'.repeat(1000)
    await expect(PostController.getPostsByUser(owner.id, 10, 0, owner.id, long, 'all')).resolves.toEqual([])
  })
})

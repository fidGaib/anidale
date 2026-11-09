import { beforeEach, describe, expect, it, vi } from 'vitest'

import { client } from '@/app/providers/apollo-client'

import { useMessagesStore } from './module'
import { ChatMessage, ConversationItem, MAX_SELECTION } from './types'

// Сеть и вход заменены заглушками: проверяется только логика стора
vi.mock('@/app/providers/apollo-client', () => ({
  client: { query: vi.fn(), mutate: vi.fn() },
}))
vi.mock('@/app/providers/routes/model', () => {
  const state = { refreshData: { id: 1, login: 'me', avatar: '' } }
  return { RefreshStore: { getState: () => state, subscribe: () => () => undefined } }
})

const store = useMessagesStore
const mutate = client.mutate as unknown as ReturnType<typeof vi.fn>

const message = (id: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  text: `м${id}`,
  date: id * 1000,
  senderId: 2,
  recipientId: 1,
  editedAt: 0,
  forwardedFrom: '',
  forwardedFromId: 0,
  replyToId: 0,
  replyTo: null,
  attachments: [],
  reactions: [],
  ...extra,
})

const conversation = (userId: number, extra: Partial<ConversationItem> = {}): ConversationItem => ({
  user: { id: userId, login: `user${userId}`, avatar: '' },
  lastMessage: message(userId * 100, { senderId: userId }),
  unread: 0,
  muted: false,
  archived: false,
  pinned: false,
  ...extra,
})

beforeEach(() => {
  store.getState().reset()
  mutate.mockReset()
  mutate.mockResolvedValue({ data: {} })
})

describe('выбор сообщений', () => {
  it('первое нажатие включает режим выбора, повторное снимает, последнее снятие выключает режим', () => {
    const { toggleSelect } = store.getState()
    toggleSelect(10)
    toggleSelect(11)
    expect(store.getState().selection).toEqual([10, 11])
    toggleSelect(10)
    expect(store.getState().selection).toEqual([11])
    toggleSelect(11)
    expect(store.getState().selection).toBeNull()
  })

  it('нельзя выбрать больше лимита: появляется ошибка, выбор не растёт', () => {
    const { toggleSelect } = store.getState()
    for (let i = 1; i <= MAX_SELECTION; i++) toggleSelect(i)
    toggleSelect(999)
    expect(store.getState().selection).toHaveLength(MAX_SELECTION)
    expect(store.getState().selection).not.toContain(999)
    expect(store.getState().error).toContain(String(MAX_SELECTION))
  })

  it('удаление выбранных сообщений убирает их из выбора', () => {
    store.setState({ activeUserId: 2, messages: [message(1), message(2), message(3)], selection: [1, 2] })
    store.getState().applyDeleted({ userA: 1, userB: 2, ids: [1, 2] }, 1)
    expect(store.getState().messages.map((m) => m.id)).toEqual([3])
    expect(store.getState().selection).toBeNull()
  })
})

describe('новые сообщения', () => {
  it('входящее в открытом чате добавляется в конец и помечается прочитанным', () => {
    store.setState({ activeUserId: 2, messages: [message(1)], conversations: [conversation(2, { unread: 0 })] })
    store.getState().receive(message(2), 1)
    expect(store.getState().messages.map((m) => m.id)).toEqual([1, 2])
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('то же сообщение дважды (ответ и сокет) не дублируется', () => {
    store.setState({ activeUserId: 2, messages: [message(1)], conversations: [conversation(2)] })
    store.getState().receive(message(5), 1)
    store.getState().receive(message(5), 1)
    expect(store.getState().messages.filter((m) => m.id === 5)).toHaveLength(1)
  })

  it('входящее в закрытый чат увеличивает счётчик непрочитанных и поднимает диалог наверх', () => {
    store.setState({ conversations: [conversation(3), conversation(2)] })
    // Новое сообщение свежее всего, что уже есть в диалогах
    store.getState().receive(message(50, { date: Date.now() }), 1)
    const [first, second] = store.getState().conversations
    expect(first.user.id).toBe(2)
    expect(first.unread).toBe(1)
    expect(second.user.id).toBe(3)
  })

  it('закреплённый диалог остаётся выше свежего непрошеного', () => {
    store.setState({ conversations: [conversation(3, { pinned: true }), conversation(2)] })
    store.getState().receive(message(50, { date: Date.now() }), 1)
    expect(store.getState().conversations.map((c) => c.user.id)).toEqual([3, 2])
  })

  it('сообщение возвращает диалог из архива, но не если он заглушён', () => {
    store.setState({
      conversations: [conversation(2, { archived: true }), conversation(3, { archived: true, muted: true })],
    })
    store.getState().receive(message(50, { senderId: 2 }), 1)
    store.getState().receive(message(51, { senderId: 3 }), 1)
    const byId = Object.fromEntries(store.getState().conversations.map((c) => [c.user.id, c]))
    expect(byId[2].archived).toBe(false)
    expect(byId[3].archived).toBe(true)
  })

  it('если показан кусок старой истории, свежие сообщения не вставляются, а считаются пропущенными', () => {
    store.setState({
      activeUserId: 2,
      detached: true,
      messages: [message(1)],
      conversations: [conversation(2)],
    })
    store.getState().receive(message(77), 1)
    expect(store.getState().messages.map((m) => m.id)).toEqual([1])
    expect(store.getState().missedWhileDetached).toBe(1)
  })
})

describe('реакции, закрепы и настройки', () => {
  it('реакции обновляются у сообщения и у закреплённой копии, только в открытом чате', () => {
    const msg = message(1)
    store.setState({ activeUserId: 2, messages: [msg], pinnedList: [msg] })
    store.getState().applyReactions({ userA: 1, userB: 2, id: 1, reactions: [{ userId: 2, emoji: '🔥' }] }, 1)
    expect(store.getState().messages[0].reactions).toEqual([{ userId: 2, emoji: '🔥' }])
    expect(store.getState().pinnedList[0].reactions).toEqual([{ userId: 2, emoji: '🔥' }])

    store.getState().applyReactions({ userA: 1, userB: 9, id: 1, reactions: [] }, 1)
    expect(store.getState().messages[0].reactions).toHaveLength(1)
  })

  it('своя реакция показывается сразу, повтор той же снимает её', async () => {
    store.setState({ activeUserId: 2, messages: [message(1)] })
    await store.getState().react(1, '👍')
    expect(store.getState().messages[0].reactions).toEqual([{ userId: 1, emoji: '👍' }])
    await store.getState().react(1, '👍')
    expect(store.getState().messages[0].reactions).toEqual([])
  })

  it('если сервер отклонил реакцию, показанное заранее откатывается', async () => {
    store.setState({ activeUserId: 2, messages: [message(1)] })
    mutate.mockRejectedValueOnce(new Error('Такая реакция недоступна'))
    await store.getState().react(1, '👍')
    expect(store.getState().messages[0].reactions).toEqual([])
    expect(store.getState().error).toBe('Такая реакция недоступна')
  })

  it('настройки диалога применяются сразу и откатываются при ошибке', async () => {
    store.setState({ conversations: [conversation(2), conversation(3)] })
    await store.getState().setSettings(3, { pinned: true })
    expect(store.getState().conversations.map((c) => c.user.id)).toEqual([3, 2])

    mutate.mockRejectedValueOnce(new Error('нет сети'))
    await store.getState().setSettings(2, { muted: true })
    expect(store.getState().conversations.find((c) => c.user.id === 2)?.muted).toBe(false)
    expect(store.getState().error).toBe('нет сети')
  })

  it('статус «печатает» только для открытого чата, прочитанное не откатывается назад', () => {
    store.setState({ activeUserId: 2 })
    store.getState().applyTyping(9)
    expect(store.getState().peerTyping).toBe(false)
    store.getState().applyTyping(2)
    expect(store.getState().peerTyping).toBe(true)

    store.getState().applyRead({ reader: 2, upTo: 10 })
    store.getState().applyRead({ reader: 2, upTo: 5 })
    expect(store.getState().peerRead).toBe(10)
  })
})

import { describe, expect, it } from 'vitest'

import { MAX_SELECTION, REACTIONS, toMessage } from './types'

describe('toMessage: сообщение с сервера в вид для интерфейса', () => {
  it('пустое сообщение получает безопасные значения по умолчанию', () => {
    expect(toMessage({})).toEqual({
      id: 0,
      text: '',
      date: 0,
      senderId: 0,
      recipientId: 0,
      editedAt: 0,
      forwardedFrom: '',
      forwardedFromId: 0,
      replyToId: 0,
      replyTo: null,
      attachments: [],
      reactions: [],
    })
  })

  it('дата из GraphQL (число) и из сокета (строка ISO) приводится к миллисекундам одинаково', () => {
    const iso = '2026-03-04T10:00:00.000Z'
    const viaSocket = toMessage({ id: 1, date: iso, editedAt: iso })
    const viaGraphql = toMessage({ id: 1, date: Date.parse(iso), editedAt: Date.parse(iso) })
    expect(viaSocket.date).toBe(viaGraphql.date)
    expect(viaSocket.editedAt).toBe(Date.parse(iso))
  })

  it('вложения: неизвестный тип считается файлом, пустые элементы отбрасываются', () => {
    const message = toMessage({
      attachments: [
        { id: 1, kind: 'image', name: 'a.png', size: 10, file: 'f1', thumb: 't1' },
        { id: 2, kind: 'audio', name: 'a.mp3' },
        { id: 3, kind: 'something', name: 'x' },
        null,
        { id: 4 },
      ],
    })
    expect(message.attachments.map((a) => a.kind)).toEqual(['image', 'audio', 'file', 'file'])
    expect(message.attachments[0]).toMatchObject({ file: 'f1', thumb: 't1', size: 10 })
    expect(message.attachments[3]).toMatchObject({ name: 'file', size: 0, file: '' })
  })

  it('цитата и реакции переносятся, пустые реакции отбрасываются', () => {
    const message = toMessage({
      replyToId: 5,
      replyTo: { id: 5, senderId: 2, text: 'вопрос', attachmentKind: 'image', attachmentName: 'p.png' },
      reactions: [{ userId: 3, emoji: '👍' }, null, { userId: null, emoji: null }],
    })
    expect(message.replyTo).toEqual({
      id: 5,
      senderId: 2,
      text: 'вопрос',
      attachmentKind: 'image',
      attachmentName: 'p.png',
    })
    expect(message.reactions).toEqual([
      { userId: 3, emoji: '👍' },
      { userId: 0, emoji: '' },
    ])
  })
})

describe('константы мессенджера', () => {
  it('набор реакций совпадает с разрешённым на сервере (8 штук без повторов)', () => {
    expect(REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'])
    expect(new Set(REACTIONS).size).toBe(REACTIONS.length)
  })

  it('выбрать можно до 30 сообщений, как и на сервере', () => {
    expect(MAX_SELECTION).toBe(30)
  })
})

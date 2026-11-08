import { useEffect } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useSocket } from '@/shared/hooks/useSocket'

import { toMessage, useMessagesStore } from './module'

/**
 * Невидимый компонент, который живёт всё время работы приложения:
 * подгружает диалоги после входа и принимает новые сообщения по сокету,
 * чтобы счётчик непрочитанных в меню обновлялся на любой странице.
 */
export const MessagesBridge = () => {
  const myId = useRefreshStore((s) => s.refreshData.id)
  const { socket, isConnected } = useSocket()
  const loadConversations = useMessagesStore((s) => s.loadConversations)
  const receive = useMessagesStore((s) => s.receive)
  const drop = useMessagesStore((s) => s.drop)
  const applyUpdated = useMessagesStore((s) => s.applyUpdated)
  const applyDeleted = useMessagesStore((s) => s.applyDeleted)
  const applyPinned = useMessagesStore((s) => s.applyPinned)

  useEffect(() => {
    if (myId) void loadConversations()
  }, [myId, loadConversations])

  useEffect(() => {
    if (!socket || !isConnected || !myId) return
    // По сокету дата приходит строкой ISO, toMessage приводит её так же, как ответы GraphQL
    const onNew = ({ message }: { message: Parameters<typeof toMessage>[0] }) => receive(toMessage(message), myId)
    // Диалог удалён (собеседником «у всех» или мной в другой вкладке): убираем его и здесь
    const onDeleted = ({ userA, userB }: { userA: number; userB: number }) => drop(userA === myId ? userB : userA)
    // Сообщение изменено, удалено или закреплено: обновляем открытый чат и список диалогов
    const onUpdated = ({ message }: { message: Parameters<typeof toMessage>[0] }) => applyUpdated(toMessage(message))
    const onMessagesDeleted = (event: { userA: number; userB: number; ids: number[] }) => applyDeleted(event, myId)
    const onPinned = (event: { userA: number; userB: number; pinnedMessageId: number | null }) =>
      applyPinned(event, myId)
    socket.on('newMessage', onNew)
    socket.on('conversationDeleted', onDeleted)
    socket.on('messageUpdated', onUpdated)
    socket.on('messagesDeleted', onMessagesDeleted)
    socket.on('messagePinned', onPinned)
    return () => {
      socket.off('newMessage', onNew)
      socket.off('conversationDeleted', onDeleted)
      socket.off('messageUpdated', onUpdated)
      socket.off('messagesDeleted', onMessagesDeleted)
      socket.off('messagePinned', onPinned)
    }
  }, [socket, isConnected, myId, receive, drop, applyUpdated, applyDeleted, applyPinned])

  return null
}

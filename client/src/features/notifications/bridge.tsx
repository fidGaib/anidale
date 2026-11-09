import { useEffect } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useMessagesStore } from '@/features/messages'
import { useSocket } from '@/shared/hooks/useSocket'

import { AppNotification, toNotification, useNotificationsStore } from './module'
import { notificationText } from './text'
import { Toasts } from './toasts'

interface SocketMessage {
  senderId?: number
  text?: string
  attachments?: { kind?: string; name?: string }[]
}

/**
 * Невидимый компонент на всё время работы приложения: считает непрочитанные уведомления,
 * принимает новые по сокету и показывает всплывающие окна (уведомления и сообщения вне открытого чата).
 */
export const NotificationsBridge = () => {
  const myId = useRefreshStore((s) => s.refreshData.id)
  const { socket, isConnected } = useSocket()
  const loadUnread = useNotificationsStore((s) => s.loadUnread)

  useEffect(() => {
    if (myId) void loadUnread()
  }, [myId, loadUnread])

  useEffect(() => {
    if (!socket || !isConnected || !myId) return
    const store = useNotificationsStore.getState

    const onNotification = ({ notification }: { notification: Parameters<typeof toNotification>[0] }) => {
      const n: AppNotification = toNotification(notification)
      store().receive(n)
      store().pushToast({
        title: n.actor.login || 'Уведомление',
        text: notificationText(n),
        link: n.type === 'track' ? '/music' : n.postId ? `/feed?post=${n.postId}` : `/profile/${myId}`,
        avatar: n.actor.avatar,
      })
    }
    const onRead = () => store().applyRead()

    const onMessage = ({ message }: { message: SocketMessage }) => {
      const senderId = message.senderId ?? 0
      if (!senderId || senderId === myId) return
      const messages = useMessagesStore.getState()
      // Этот чат открыт прямо сейчас: сообщение и так на экране
      if (messages.activeUserId === senderId && !document.hidden) return
      const conversation = messages.conversations.find((c) => c.user.id === senderId)
      if (conversation?.muted) return
      const first = message.attachments?.[0]
      const label = first ? (first.kind === 'image' ? 'Фото' : first.kind === 'audio' ? 'Аудио' : (first.name ?? 'Файл')) : ''
      store().pushToast({
        title: conversation?.user.login ?? 'Новое сообщение',
        text: message.text || label,
        link: `/messages/${senderId}`,
        avatar: conversation?.user.avatar ?? '',
      })
    }

    socket.on('notification', onNotification)
    socket.on('notificationsRead', onRead)
    // Именованный обработчик: socket.off('newMessage') без него снял бы и обработчик мессенджера
    socket.on('newMessage', onMessage)
    return () => {
      socket.off('notification', onNotification)
      socket.off('notificationsRead', onRead)
      socket.off('newMessage', onMessage)
    }
  }, [socket, isConnected, myId])

  return myId ? <Toasts /> : null
}


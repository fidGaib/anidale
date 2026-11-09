import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { PRESENCE } from '@/shared/graphql/schema'
import { useSocket } from '@/shared/hooks/useSocket'
import { toTimestamp } from '@/shared/lib/time'

export interface OnlineState {
  online: boolean
  /** Когда человек был в сети в последний раз (мс); 0, если неизвестно. */
  lastSeenAt: number
}

/**
 * «В сети» для профиля. Для чужого профиля: запрос при открытии и подписка на события сокета,
 * чтобы точка у аватара появлялась и пропадала без перезагрузки. Свой профиль: онлайн, пока есть подключение.
 */
export const useOnline = (userId: number, isOwn: boolean): OnlineState => {
  const { socket, isConnected } = useSocket()
  const { data } = useQuery(PRESENCE, {
    variables: { userId },
    skip: !userId || isOwn,
    fetchPolicy: 'network-only',
  })
  const [live, setLive] = useState<OnlineState | null>(null)

  // Новый профиль: прошлые живые данные не подходят
  useEffect(() => {
    setLive(null)
  }, [userId])

  useEffect(() => {
    if (!socket || !isConnected || !userId || isOwn) return
    // Подписка на статус одного человека за раз; после переподключения подписываемся заново
    socket.emit('watch', { userId })
    const onPresence = (event: { userId: number; online: boolean; lastSeenAt: unknown }) => {
      if (event.userId === userId) setLive({ online: event.online, lastSeenAt: toTimestamp(event.lastSeenAt) })
    }
    socket.on('presence', onPresence)
    return () => {
      socket.off('presence', onPresence)
      socket.emit('watch', { userId: null })
    }
  }, [socket, isConnected, userId, isOwn])

  if (isOwn) return { online: isConnected, lastSeenAt: 0 }
  if (live) return live
  return { online: !!data?.getPresence.online, lastSeenAt: toTimestamp(data?.getPresence.lastSeenAt) }
}

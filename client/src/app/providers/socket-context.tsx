// context/SocketContext.tsx
import { createContext, useEffect, useState } from 'react'
import { Socket, io } from 'socket.io-client'

import { SOCKET_URL } from '@/shared/config'

import { useRefreshStore } from './routes/model'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  // Личные события (сообщения) сервер привязывает к пользователю по кукам из рукопожатия,
  // поэтому при входе, выходе и смене пользователя соединение пересоздаётся
  const myId = useRefreshStore((state) => state.refreshData.id)

  useEffect(() => {
    const next = io(SOCKET_URL, {
      // Только WebSocket: без рукопожатия через опрос (polling) и без перехода на WebSocket
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    next.on('connect', () => {
      setIsConnected(true)
    })

    next.on('disconnect', () => {
      setIsConnected(false)
    })

    setSocket(next)

    // Очистка при размонтировании и при смене пользователя
    return () => {
      next.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [myId])

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}

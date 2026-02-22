// context/SocketContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Socket, io } from 'socket.io-client'

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
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Создаём соединение при монтировании компонента
    const socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Очистка при размонтировании
    return () => {
      socket.disconnect()
    }
  }, [])

  return <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>{children}</SocketContext.Provider>
}

/** Сколько сокетов открыто у каждого пользователя (несколько вкладок и устройств). Хранится в памяти процесса. */
const connections = new Map<number, number>()

/** Возвращает true, если это первое подключение пользователя (он только что стал «в сети»). */
export const markConnected = (userId: number) => {
  const count = (connections.get(userId) ?? 0) + 1
  connections.set(userId, count)
  return count === 1
}

/** Возвращает true, если закрылось последнее подключение (пользователь ушёл «из сети»). */
export const markDisconnected = (userId: number) => {
  const count = (connections.get(userId) ?? 0) - 1
  if (count > 0) {
    connections.set(userId, count)
    return false
  }
  connections.delete(userId)
  return true
}

export const isOnline = (userId: number) => connections.has(userId)

/** Комната подписчиков на статус пользователя. */
export const presenceRoom = (userId: number) => `presence:${userId}`

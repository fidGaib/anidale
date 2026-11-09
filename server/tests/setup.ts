import { vi } from 'vitest'

import { assertTestDatabase, buildTestUrl } from './test-db'

// База: до любых импортов приложения подменяем подключение на тестовое и проверяем имя
process.env.DB_LINK = buildTestUrl()
assertTestDatabase()

// Сокет: настоящий `@/index` поднимает HTTP-сервер, в тестах он не нужен.
// Заглушка запоминает все события, чтобы тесты могли проверять, кому и что отправлено.
vi.mock('@/index', () => {
  const events: { rooms: string[]; event: string; payload: unknown }[] = []
  const chain = (rooms: string[]) => ({
    to: (room: string) => chain([...rooms, room]),
    emit: (event: string, payload: unknown) => {
      events.push({ rooms, event, payload })
    },
  })
  const io = {
    to: (room: string) => chain([room]),
    emit: (event: string, payload: unknown) => {
      events.push({ rooms: [], event, payload })
    },
  }
  return { io, __events: events }
})

import { config } from 'dotenv'
import 'dotenv/config'
import http from 'http'
import { Server as IoServer } from 'socket.io'

import { parseCookies } from './handlers/cookie-parser'
import { serveStatic } from './handlers/file-upload'
import { yoga } from './schema'

config()

const server = http.createServer()
const io = new IoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  },
})

// Единый обработчик запросов
server.on('request', async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  // CORS-заголовки для всех ответов
  const setCorsHeaders = () => {
    if (!res.writableEnded) {
      res.setHeader('Access-Control-Allow-Origin', clientUrl)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
  }
  try {
    // Обработка preflight-запросов
    if (req.method === 'OPTIONS') {
      setCorsHeaders()
      res.writeHead(204)
      res.end()
      return
    }
    setCorsHeaders()
    if (serveStatic(req, res)) {
      return
    }
    // Парсим куки и добавляем в req
    const cookies = parseCookies(req)
    ;(req as any).cookies = cookies // Расширяем тип req
    // GraphQL через Yoga
    if (req.url?.startsWith('/graphql')) {
      await yoga(req, res)
      return
    }
  } catch (error) {
    console.log(error)
  }
})

// Обработчик Socket.IO
io.on('connection', (socket) => {
  console.log('Клиент подключился: ', socket.id)
  socket.on('disconnect', () => {
    console.log('Клиент отключился: ', socket.id)
  })
})

const stopApplication = (server: http.Server) => {
  server.close()
  return new Promise((resolve) => {
    server.on('close', () => resolve(0))
  })
}

const onHotReload = async (server: http.Server) => {
  const hotContext = import.meta.hot
  if (hotContext) {
    await hotContext.data.stopping
    hotContext.on('vite:beforeFullReload', async () => {
      console.log('\nPerforming an HMR reload...')
      hotContext.data.stopping = stopApplication(server)
    })
  }
}

const start = async () => {
  try {
    if (import.meta.hot) await import.meta.hot.data.stopping
    server.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`))
    onHotReload(server)
  } catch (e) {
    console.error(e)
  }
}

start()

export { io }

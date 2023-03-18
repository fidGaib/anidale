import express from 'express'
import type { Server } from 'http'

import handlers from './handlers'

const app = express()

handlers.forEach((h: any) => {
  if (h.path) app.use(h.path, h.func)
  else app.use(h)
})

async function stopApplication(server: Server) {
  server.close()
  return new Promise((resolve) => {
    server.on('close', resolve)
  })
}

async function onHotReload(server: Server) {
  if (import.meta.hot) await import.meta.hot.data.stopping
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
      console.log('Performing an HMR reload...')
      if (import.meta.hot) import.meta.hot.data.stopping = stopApplication(server)
    })
  }
}

const start = () => {
  try {
    const server = app.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`))
    onHotReload(server)
  } catch (e) {
    console.log(e)
  }
}

start()

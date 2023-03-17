import express from 'express'

import handlers from './handlers'

const app = express()

handlers.forEach((h: any) => {
  if (h.path) app.use(h.path, h.func)
  else app.use(h)
})

const start = async () => {
  try {
    app.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`))
  } catch (e) {
    console.log(e)
  }
}
start()

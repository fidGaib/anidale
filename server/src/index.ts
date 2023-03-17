import express from 'express'

import handlers from './handlers'
import { __dirname } from './handlers/file-upload'
import { yoga } from './schema'

const PORT = process.env.PORT
console.log(__dirname)
const app = express()
handlers.forEach((h) => app.use(h))
app.use('/storage', express.static(__dirname + './storage/'))
app.use('/graphql', yoga)

const start = async () => {
  try {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
  } catch (e) {
    console.log(e)
  }
}
start()

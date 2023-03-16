import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import fileUpload from 'express-fileupload'
import { fileURLToPath } from 'url'

// import ErrorHandlingMiddleware from './api/middleware/ErrorHandlingMiddleware'
// import router from './routes'
import { yoga } from './schema'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const PORT = process.env.PORT

const app = express()

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  }),
)
app.use(express.json())
app.use('/public', express.static(__dirname + '/public/images'))
app.use(express.static(__dirname + '/public/images'))
app.use(fileUpload({ createParentPath: true }))
app.use(cookieParser())
// app.use('/api', router)
app.use('/graphql', yoga)
// app.use(ErrorHandlingMiddleware)
const start = async () => {
  try {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
  } catch (e) {
    console.log(e)
  }
}
start()

import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import fileUpload from 'express-fileupload'

import ErrorHandlingMiddleware from './api/middleware/ErrorHandlingMiddleware'
import sequelize from './db/db'
import router from './routes'

const PORT = process.env.PORT

const app = express()

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  }),
)
app.use(express.json())
app.use('/api/uploads', express.static(__dirname + '/api/uploads'))
app.use(express.static(__dirname + '/api/uploads'))
app.use(fileUpload({ createParentPath: true }))
app.use(cookieParser())
app.use('/api', router)
app.use(ErrorHandlingMiddleware)
const start = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync()
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
  } catch (e) {
    console.log(e)
  }
}
start()

//imports
import { config } from 'dotenv'
config()
import express from 'express'
import { yoga } from './schema/schema.js'
//экземпляр express
const app = express()
//middleware
app.use('/graphql', yoga)
//Start server and connection DataDase
const start = () => {
  try {
    //start server
    app.listen(process.env.PORT, () => console.log(`Running on port ${process.env.PORT}`))
  } catch (e) {
    //errors
    console.log(e)
  }
}
//Start server and connection DataDase
start()

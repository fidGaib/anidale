import Cors from 'cors'

export const cors = Cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
})

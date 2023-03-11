import { access, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

async function generateEnv() {
  if (
    await access('.env')
      .then(() => true)
      .catch(() => false)
  ) {
    return
  }
  await writeFile(
    '.env',
    `
# server
PORT=5000
# db link
DB_LINK='postgres://postgres:root@localhost:5432/anidale'
# tokens
JWT_ACCESS_SECRET='${randomBytes(128).toString('base64')}'
JWT_REFRESH_SECRET='${randomBytes(128).toString('base64')}'
# api option
API_URL='http://localhost:5000'
CLIENT_URL='http://localhost:3000'`,
  )
}

generateEnv()

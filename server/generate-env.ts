import { randomBytes } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'

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
DB_LINK='postgresql://postgres:123@localhost:5432/anidale?schema=public'
# tokens
JWT_ACCESS_SECRET='${randomBytes(64).toString('base64')}'
JWT_REFRESH_SECRET='${randomBytes(64).toString('base64')}'
# api option
API_URL='http://localhost:5000'
CLIENT_URL='http://localhost:5173'
PASS_PEPPER = '${randomBytes(8).toString('base64')}'
`,
  )
}

generateEnv()

// DB_LINK='postgresql://anin:g4LNbRmAWXOjgZe-Smf4Zw@anidale-2897.j77.aws-eu-west-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full'
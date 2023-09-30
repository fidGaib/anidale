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
DB_LINK='postgresql://anin:JPubBNxK568hsKdTZy4JqA@broke-chicken-10698.8nj.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full'
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

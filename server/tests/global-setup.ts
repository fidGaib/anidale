import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

import { assertTestDatabase, buildTestUrl } from './test-db'

const require = createRequire(import.meta.url)

/** Один раз перед всеми тестами: пересоздаёт схему в тестовой базе (базу Prisma создаёт сам, если её нет). */
export default function setup() {
  process.env.DB_LINK = buildTestUrl()
  assertTestDatabase()

  // CLI Prisma запускается напрямую через node: так не нужна оболочка и работают любые пути
  const cli = require.resolve('prisma/build/index.js')
  execFileSync(process.execPath, [cli, 'db', 'push', '--force-reset', '--skip-generate', '--accept-data-loss'], {
    // Явно заданная переменная окружения важнее .env, поэтому Prisma работает именно с тестовой базой
    env: process.env,
    stdio: 'pipe',
  })
}

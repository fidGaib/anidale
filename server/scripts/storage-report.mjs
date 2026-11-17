#!/usr/bin/env node
/**
 * Отчёт по месту в server/storage: сколько занимает каждая папка.
 * Нужен, чтобы загрузки не съели диск незаметно.
 *
 * Запуск: npm run storage:report
 * STORAGE_WARN_GB — порог предупреждения (по умолчанию 20 ГБ).
 * Код возврата 1, если порог превышен: удобно для cron/мониторинга.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const storageDir = path.resolve(serverRoot, process.env.STORAGE_DIR || 'storage')
const warnGb = Math.max(1, Number(process.env.STORAGE_WARN_GB || 20))

const folderSize = (dir) => {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) total += folderSize(full)
    else if (entry.isFile()) total += statSync(full).size
  }
  return total
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`

if (!existsSync(storageDir)) {
  console.error(`Каталог не найден: ${storageDir}`)
  process.exit(1)
}

const rows = readdirSync(storageDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, bytes: folderSize(path.join(storageDir, entry.name)) }))
  .sort((a, b) => b.bytes - a.bytes)

const total = rows.reduce((sum, row) => sum + row.bytes, 0)
for (const row of rows) console.log(`${row.name.padEnd(14)} ${mb(row.bytes)}`)
console.log('-'.repeat(24))
console.log(`${'всего'.padEnd(14)} ${mb(total)}`)

if (total > warnGb * 1024 ** 3) {
  console.error(`Превышен порог ${warnGb} ГБ: пора чистить storage или увеличивать диск`)
  process.exit(1)
}

#!/usr/bin/env node
/**
 * Резервная копия базы и файлов.
 *
 * Запуск (из папки server): npm run backup
 * Переменные:
 *   DB_LINK                — строка подключения (берётся из server/.env)
 *   BACKUP_DIR             — куда складывать копии (по умолчанию server/backups)
 *   BACKUP_KEEP_DAYS       — сколько дней хранить копии (по умолчанию 14)
 *   BACKUP_DB_ONLY=1       — без архива storage (быстрая проверка)
 *   PG_DUMP                — путь к pg_dump, если его нет в PATH
 *
 * Копии: anidale-ГГГГММДД-ЧЧММСС.dump (pg_dump custom) и .tar.gz (storage).
 * Восстановление описано в DEPLOY.md.
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const backupDir = path.resolve(serverRoot, process.env.BACKUP_DIR || 'backups')
const storageDir = path.resolve(serverRoot, process.env.STORAGE_DIR || 'storage')
const keepDays = Math.max(1, Number(process.env.BACKUP_KEEP_DAYS || 14))

const fail = (message) => {
  console.error(`Ошибка резервного копирования: ${message}`)
  process.exit(1)
}

const runs = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'ignore' })
  return result.status === 0
}

/** pg_dump не всегда есть в PATH (Windows), поэтому проверяем типовые места установки. */
const findPgDump = () => {
  const candidates = []
  if (process.env.PG_DUMP) candidates.push(process.env.PG_DUMP)
  candidates.push('pg_dump')
  if (process.platform === 'win32') {
    for (const base of ['C:\\Program Files\\PostgreSQL', 'C:\\Program Files (x86)\\PostgreSQL']) {
      if (!existsSync(base)) continue
      for (const version of readdirSync(base)) candidates.push(path.join(base, version, 'bin', 'pg_dump.exe'))
    }
  }
  return candidates.find((candidate) => runs(candidate, ['--version'])) ?? null
}

/** Параметры подключения через переменные окружения: пароль не попадает в список процессов. */
const databaseEnv = () => {
  const link = process.env.DB_LINK?.trim()
  if (!link) fail('не задан DB_LINK (проверьте server/.env)')
  try {
    const url = new URL(link)
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
    return {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: database,
    }
  } catch {
    return { ...process.env, PGDATABASE: link }
  }
}

const stamp = () => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const size = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} МБ`

const removeOld = () => {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
  for (const name of readdirSync(backupDir)) {
    if (!/^anidale-.*\.(dump|tar\.gz)$/.test(name)) continue
    const file = path.join(backupDir, name)
    if (statSync(file).mtimeMs < cutoff) {
      unlinkSync(file)
      console.log(`Удалена старая копия: ${name}`)
    }
  }
}

const main = () => {
  const pgDump = findPgDump()
  if (!pgDump) fail('pg_dump не найден. Укажите путь в PG_DUMP или добавьте PostgreSQL bin в PATH')
  const tar = runs('tar', ['--version']) ? 'tar' : null
  if (!tar && !process.env.BACKUP_DB_ONLY) {
    fail('tar не найден, а BACKUP_DB_ONLY не задан. Установите tar или задайте BACKUP_DB_ONLY=1')
  }

  mkdirSync(backupDir, { recursive: true })
  const name = `anidale-${stamp()}`

  const dumpFile = path.join(backupDir, `${name}.dump`)
  console.log(`Дамп базы → ${dumpFile}`)
  const dump = spawnSync(
    pgDump,
    ['--format=custom', '--no-owner', '--no-privileges', '--file', dumpFile],
    { env: databaseEnv(), stdio: 'inherit' },
  )
  if (dump.status !== 0) fail('pg_dump завершился с ошибкой')
  console.log(`Готово: ${size(dumpFile)}`)

  if (!process.env.BACKUP_DB_ONLY) {
    if (!existsSync(storageDir)) {
      console.log(`Каталог ${storageDir} отсутствует, архив файлов пропущен`)
    } else {
      const storageFile = path.join(backupDir, `${name}.tar.gz`)
      console.log(`Архив файлов → ${storageFile}`)
      const archive = spawnSync(tar, ['-czf', storageFile, '-C', path.dirname(storageDir), path.basename(storageDir)], {
        stdio: 'inherit',
      })
      if (archive.status !== 0) fail('tar завершился с ошибкой')
      console.log(`Готово: ${size(storageFile)}`)
    }
  }

  removeOld()
  console.log(`Резервная копия завершена. Храним ${keepDays} дн. в ${backupDir}`)
}

main()

#!/usr/bin/env node
// Запускает vite-node с UV_THREADPOOL_SIZE, рассчитанным по числу логических процессоров.
// Пул потоков libuv используется для bcrypt, файловых операций и dns. По умолчанию в нём 4 потока.
// Переменная задаётся в окружении дочернего процесса, поэтому действует с самого старта
// (внутри кода её задавать поздно: vite-node грузит модули асинхронно и пул уже может быть создан).
// Если UV_THREADPOOL_SIZE уже задана вручную, она имеет приоритет.
import { spawn } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// Максимум, который допускает libuv
const LIBUV_MAX_THREADS = 1024

const threads =
  process.env.UV_THREADPOOL_SIZE || String(Math.min(os.availableParallelism(), LIBUV_MAX_THREADS))

// `--prod` запускает сервер в боевом режиме: NODE_ENV=production (без интроспекции GraphQL, с Secure-куками и HSTS)
const args = process.argv.slice(2).filter((arg) => arg !== '--prod')
const production = process.argv.includes('--prod')

const viteNode = fileURLToPath(new URL('../node_modules/vite-node/dist/cli.mjs', import.meta.url))

const child = spawn(process.execPath, [viteNode, ...args], {
  stdio: 'inherit',
  env: { ...process.env, UV_THREADPOOL_SIZE: threads, ...(production ? { NODE_ENV: 'production' } : {}) },
})

// Сигналы передаём дочернему процессу, чтобы сервер корректно завершался
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})

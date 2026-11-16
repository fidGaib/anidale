#!/usr/bin/env node
// Копирует нативный модуль обработки картинок в dist после сборки.
// Бандлить его нельзя: это CJS с require('./index.<platform>.node').
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = path.join(serverRoot, 'src', 'api', 'post', 'native')
const destination = path.join(serverRoot, 'dist', 'api', 'post', 'native')

if (!existsSync(source)) {
  console.error(`Не найден каталог нативного модуля: ${source}`)
  process.exit(1)
}

mkdirSync(destination, { recursive: true })
let binaries = 0
for (const name of readdirSync(source)) {
  if (name.endsWith('.node')) binaries += 1
  if (!name.endsWith('.node') && name !== 'index.js' && name !== 'index.d.ts' && name !== 'package.json') continue
  copyFileSync(path.join(source, name), path.join(destination, name))
}

if (!binaries) {
  console.error('В нативном модуле нет файлов .node: соберите его перед сборкой сервера')
  process.exit(1)
}

console.log(`Нативный модуль скопирован в dist (${binaries} файл(ов) .node)`)

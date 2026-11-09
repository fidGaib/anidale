import * as fs from 'fs'
import http from 'http'
import * as mime from 'mime-types'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Получаем __dirname для ES‑модулей
export const __dirname = fileURLToPath(new URL('../../', import.meta.url))

export const serveStatic = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!req.url?.startsWith('/storage/')) {
    return false // Не наш запрос — возвращаем false
  }

  // Query-строку (например, ?name= для скачиваемых файлов) в путь файла не берём
  const requestUrl = new URL(req.url, 'http://localhost')
  const relativePath = requestUrl.pathname.replace('/storage/', '')

  // Формируем полный путь к файлу
  const filePath = path.join(__dirname, 'storage', relativePath)

  // Нормализуем путь, чтобы избежать атак через ../
  const normalizedPath = path.normalize(filePath)

  // Проверяем, что файл находится внутри разрешённой директории
  if (!normalizedPath.startsWith(path.join(__dirname, 'storage'))) {
    res.writeHead(403)
    res.end('Forbidden')
    return true
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    // Определяем MIME‑тип
    const contentType = mime.lookup(normalizedPath) || 'application/octet-stream'

    // Пустой файл: createReadStream не принимает end = -1
    if (stats.size === 0) {
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': 0 })
      res.end()
      return
    }

    // Range нужен для перемотки аудио: браузер запрашивает кусок файла
    let start = 0
    let end = stats.size - 1
    let partial = false
    const range = req.headers.range
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` })
        res.end()
        return
      }
      if (match[1]) {
        start = parseInt(match[1], 10)
        if (match[2]) end = Math.min(parseInt(match[2], 10), end)
      } else {
        // bytes=-N: последние N байт
        start = Math.max(stats.size - parseInt(match[2], 10), 0)
      }
      if (start > end || start >= stats.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` })
        res.end()
        return
      }
      partial = true
    }

    // Создаём поток для чтения файла (эффективнее, чем fs.readFile для больших файлов)
    const fileStream = fs.createReadStream(normalizedPath, { start, end })

    // Без обработчика 'error' ошибка чтения файла уронит весь процесс
    fileStream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500)
        res.end('Internal Server Error')
      } else {
        res.destroy()
      }
    })

    // Файлы из сообщений хранятся без расширения и отдаются только на скачивание:
    // так загруженный html/svg не выполнится на нашем домене
    const download: Record<string, string> = relativePath.startsWith('messages/files/')
      ? {
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
            // eslint-disable-next-line no-control-regex
            (requestUrl.searchParams.get('name') ?? 'file').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 150) ||
              'file',
          )}`,
          'Content-Security-Policy': 'sandbox',
        }
      : {}

    res.writeHead(partial ? 206 : 200, {
      ...download,
      'Content-Type': contentType,
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000', // Кеширование на год
      ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${stats.size}` } : {}),
    })

    fileStream.pipe(res)
  })

  return true // Запрос обработан
}

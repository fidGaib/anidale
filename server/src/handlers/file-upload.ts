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

  // Формируем полный путь к файлу
  const filePath = path.join(__dirname, 'storage', req.url.replace('/storage/', ''))

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

    // Создаём поток для чтения файла (эффективнее, чем fs.readFile для больших файлов)
    const fileStream = fs.createReadStream(normalizedPath)

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Кеширование на год
    })

    fileStream.pipe(res)
  })

  return true // Запрос обработан
}

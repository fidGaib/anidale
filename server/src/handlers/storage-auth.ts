import http from 'http'

import { canAccessFile, cleanRelative, viewerFromCookies } from '../api/storage/access'
import { parseCookies } from './cookie-parser'

/** Запрос пришёл с этого же компьютера: так обращается nginx. Снаружи этот адрес не должен отвечать. */
const isLoopback = (address: string | undefined) =>
  !!address && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)

/**
 * Проверка доступа к файлу для nginx (`auth_request`): nginx сам отдаёт файл с диска, а решает, можно ли,
 * этот сервер. Исходный адрес приходит в заголовке X-Original-URI, а куки входа — вместе с запросом.
 * Ответ 204 — отдавать, 403 — нет.
 */
export const storageAuth = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!isLoopback(req.socket.remoteAddress)) {
    res.writeHead(403)
    res.end()
    return
  }
  const original = String(req.headers['x-original-uri'] ?? '')
  const pathname = original.split('?')[0]
  const relative = pathname.startsWith('/storage/') ? cleanRelative(pathname.slice('/storage/'.length)) : null
  if (!relative) {
    res.writeHead(403)
    res.end()
    return
  }
  try {
    const viewerId = await viewerFromCookies(parseCookies(req))
    res.writeHead((await canAccessFile(relative, viewerId)) ? 204 : 403)
  } catch {
    res.writeHead(500)
  }
  res.end()
}

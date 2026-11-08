import http from 'http'

// Адреса для локальной разработки фронтенда (всегда разрешены)
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

/**
 * Список разрешённых origin. Единый источник правды для HTTP (GraphQL, /storage)
 * и Socket.IO. CLIENT_URL читается при каждом вызове, чтобы порядок загрузки
 * модулей (dotenv) не имел значения.
 */
export const getAllowedOrigins = (): string[] => {
  const clientUrl = process.env.CLIENT_URL?.trim()
  return clientUrl ? [clientUrl, ...DEV_ORIGINS.filter((origin) => origin !== clientUrl)] : DEV_ORIGINS
}

/**
 * Выставляет CORS-заголовки. Origin возвращается только если он в списке разрешённых,
 * иначе заголовков нет и браузер блокирует ответ.
 */
export const applyCors = (req: http.IncomingMessage, res: http.ServerResponse) => {
  // Socket.IO отвечает на свои запросы через тот же server и может уже закрыть res
  if (res.headersSent || res.writableEnded) return
  res.setHeader('Vary', 'Origin')
  const origin = req.headers.origin
  if (!origin || !getAllowedOrigins().includes(origin)) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
}

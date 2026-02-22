import http from 'http'

export const parseCookies = (req: http.IncomingMessage) => {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return {}
  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key) cookies[key] = decodeURIComponent(value)
      return cookies
    },
    {} as Record<string, string>,
  )
}

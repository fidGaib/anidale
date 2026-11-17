/**
 * Логи сервера.
 *
 * В разработке — обычный console (читаемо в терминале).
 * В продакшене — JSON-строки в stdout/stderr: их удобно собирать journald или
 * внешним сборщиком логов. Ошибки уходят в stderr.
 */
type Level = 'info' | 'warn' | 'error'

const isProduction = process.env.NODE_ENV === 'production'

const normalize = (value: unknown) =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value

const write = (level: Level, args: unknown[]) => {
  if (!isProduction) {
    console[level](...args)
    return
  }
  const message = args.filter((arg) => typeof arg === 'string').join(' ')
  const meta = args.filter((arg) => typeof arg !== 'string').map(normalize)
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...(meta.length ? { meta } : {}),
  })
  const stream = level === 'error' ? process.stderr : process.stdout
  stream.write(`${line}\n`)
}

export const logger = {
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
  /** Подробности только в разработке: подключения сокетов и подобное. */
  debug: (...args: unknown[]) => {
    if (!isProduction) console.log(...args)
  },
}

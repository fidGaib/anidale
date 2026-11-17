/**
 * Замер загрузки страницы в браузере с отключённым кэшем и ограничением сети.
 * Помогает отличить проблему продакшена от «тяжёлого» dev-сервера.
 *
 * Запуск (из папки client):
 *   node scripts/perf-feed.mjs http://localhost fast4g
 *   node scripts/perf-feed.mjs http://localhost:5173 fast4g
 *
 * Профили: none, fast4g (9 Мбит/с, 170 мс), slow4g (1.6 Мбит/с, 150 мс).
 * Кэш отключён, как в DevTools: замер соответствует первому визиту.
 */
import { chromium } from '@playwright/test'

const base = process.argv[2] || 'http://localhost'
const name = process.argv[3] || 'fast4g'
const path = process.argv[4] || '/feed'

const profiles = {
  none: { latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: 'wifi' },
  fast4g: {
    latency: 170,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (1.5 * 1024 * 1024) / 8,
    connectionType: 'cellular4g',
  },
  slow4g: {
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular4g',
  },
}

const profile = profiles[name]
if (!profile) {
  console.error(`Неизвестный профиль «${name}». Доступны: ${Object.keys(profiles).join(', ')}`)
  process.exit(1)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile })

const errors = []
page.on('pageerror', (error) => errors.push(error.message))

const startedAt = Date.now()
await page.goto(`${base}${path}`, { waitUntil: 'load', timeout: 180_000 })
const loadMs = Date.now() - startedAt
// Даём странице дорисоваться: запросы картинок и данных идут после load
await page.waitForTimeout(6000)

const nav = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON())
const resources = await page.evaluate(() =>
  performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    type: entry.initiatorType,
    transfer: entry.transferSize,
    encoded: entry.encodedBodySize,
    duration: Math.round(entry.duration),
    start: Math.round(entry.startTime),
  })),
)

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} КБ`
const bytesOf = (item) => item.transfer || item.encoded || 0
const byType = new Map()
for (const item of resources) {
  const type = item.name.includes('/graphql') ? 'graphql' : item.type
  const acc = byType.get(type) || { count: 0, bytes: 0, time: 0 }
  acc.count += 1
  acc.bytes += bytesOf(item)
  acc.time = Math.max(acc.time, item.start + item.duration)
  byType.set(type, acc)
}

console.log(`\n=== ${base}${path}, профиль ${name} ===`)
console.log(`URL после загрузки: ${page.url()}`)
console.log(
  `load: ${loadMs} мс, domContentLoaded: ${Math.round(nav?.domContentLoadedEventEnd ?? 0)} мс, loadEvent: ${Math.round(nav?.loadEventEnd ?? 0)} мс`,
)
console.log(`запросов: ${resources.length}, всего передано: ${kb(resources.reduce((sum, item) => sum + bytesOf(item), 0))}`)

console.log('\nпо типам (запросов / байт / когда закончилось):')
for (const [type, value] of [...byType.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${type.padEnd(16)} ${String(value.count).padStart(3)}  ${kb(value.bytes).padStart(10)}  ${String(value.time).padStart(6)} мс`)
}

console.log('\nсамые большие:')
for (const item of [...resources].sort((a, b) => bytesOf(b) - bytesOf(a)).slice(0, 12)) {
  console.log(`  ${kb(bytesOf(item)).padStart(10)}  ${String(item.duration).padStart(5)} мс  старт ${String(item.start).padStart(5)}  ${item.name.replace(base, '')}`)
}

console.log('\nсамые долгие:')
for (const item of [...resources].sort((a, b) => b.duration - a.duration).slice(0, 12)) {
  console.log(`  ${String(item.duration).padStart(5)} мс  старт ${String(item.start).padStart(5)}  ${kb(bytesOf(item)).padStart(10)}  ${item.name.replace(base, '')}`)
}

if (errors.length) console.log(`\nОшибки страницы:\n  ${errors.join('\n  ')}`)
await browser.close()

import 'dotenv/config'

/**
 * Строка подключения к ТЕСТОВОЙ базе. Берётся из DB_LINK (как у сервера), меняется только имя базы:
 * `anidale` → `anidale_test`. Саму строку (там пароль) нигде не выводим.
 *
 * Защита: если имя базы не оканчивается на `_test`, тесты не запускаются. Так ни при какой ошибке
 * они не смогут очистить рабочую базу.
 */
export const SUFFIX = '_test'

export const databaseName = (link: string) => decodeURIComponent(new URL(link).pathname.replace(/^\//, ''))

export const buildTestUrl = (): string => {
  const base = process.env.TEST_DB_LINK || process.env.DB_LINK
  if (!base) throw new Error('Не задан DB_LINK: тесты не знают, к какому серверу PostgreSQL подключаться')
  const url = new URL(base)
  const name = databaseName(base)
  if (!name.endsWith(SUFFIX)) url.pathname = `/${name}${SUFFIX}`
  return url.toString()
}

/** Бросает ошибку, если текущее подключение указывает не на тестовую базу. */
export const assertTestDatabase = () => {
  const link = process.env.DB_LINK
  if (!link || !databaseName(link).endsWith(SUFFIX)) {
    throw new Error(`Отказ: тесты разрешено запускать только на базе с именем, оканчивающимся на «${SUFFIX}»`)
  }
}

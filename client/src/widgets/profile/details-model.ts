export interface DetailsSource {
  city?: string | null
  work?: string | null
  education?: string | null
  about?: string | null
  website?: string | null
  /** Дата рождения уже в читаемом виде. */
  birth?: string
}

export interface DetailRow {
  key: 'birth' | 'city' | 'work' | 'education' | 'website' | 'about'
  label: string
  value: string
  /** Значение — ссылка (только http/https). */
  link?: string
}

/** Только http(s)-ссылка может быть кликабельной: остальное показываем текстом. */
export const safeLink = (value: string): string | undefined => {
  const text = value.trim()
  return /^https?:\/\/\S+$/i.test(text) ? text : undefined
}

/** Строки блока «Подробнее»: заполненные поля в порядке показа. */
export const buildDetails = (source: DetailsSource): DetailRow[] => {
  const rows: DetailRow[] = []
  const add = (key: DetailRow['key'], label: string, raw?: string | null) => {
    const value = (raw ?? '').trim()
    if (value) rows.push({ key, label, value, link: key === 'website' ? safeLink(value) : undefined })
  }
  add('birth', 'День рождения', source.birth)
  add('city', 'Город', source.city)
  add('work', 'Место работы', source.work)
  add('education', 'Образование', source.education)
  add('website', 'Сайт', source.website)
  add('about', 'О себе', source.about)
  return rows
}

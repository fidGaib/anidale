export const MAX_TITLE = 120

/** Название по умолчанию: имя файла без расширения, не длиннее предела. */
export const titleFromName = (name: string) => name.replace(/\.[^.]+$/, '').slice(0, MAX_TITLE)

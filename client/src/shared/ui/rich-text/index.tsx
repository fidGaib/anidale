import { Fragment } from 'react'

// Ссылки только http(s) и www.: javascript:, data: и прочие схемы кликабельными не делаем
const LINK = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi
// Знаки в конце, которые обычно относятся к предложению, а не к ссылке
const TRAILING = /[.,;:!?)\]}»]+$/

/** Текст сообщения с кликабельными ссылками. Остальное выводится как обычный текст (React экранирует его сам). */
export const RichText = ({ text }: { text: string }) => {
  const parts: (string | { url: string; label: string; tail: string })[] = []
  let last = 0
  for (const match of text.matchAll(LINK)) {
    const start = match.index ?? 0
    const raw = match[1]
    const label = raw.replace(TRAILING, '')
    if (start > last) parts.push(text.slice(last, start))
    parts.push({
      url: /^https?:\/\//i.test(label) ? label : `https://${label}`,
      label,
      tail: raw.slice(label.length),
    })
    last = start + raw.length
  }
  if (last < text.length) parts.push(text.slice(last))

  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <Fragment key={index}>
            <a href={part.url} target='_blank' rel='noopener noreferrer nofollow'>
              {part.label}
            </a>
            {part.tail}
          </Fragment>
        ),
      )}
    </>
  )
}

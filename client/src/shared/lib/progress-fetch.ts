export interface UploadProgressEvent {
  loaded: number
  total: number
}

type ProgressInit = RequestInit & { onProgress?: (event: UploadProgressEvent) => void }

const parseHeaders = (raw: string) => {
  const headers = new Headers()
  raw
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const index = line.indexOf(':')
      if (index > 0) headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
    })
  return headers
}

/**
 * Процент 0–100 по событию прогресса. total = 0 (размер неизвестен) считаем нулём.
 */
export const toPercent = ({ loaded, total }: UploadProgressEvent) =>
  total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0

/**
 * Замена fetch для apollo-upload-client. Обычный fetch не сообщает, сколько байт уже ушло на сервер,
 * поэтому запросы с onProgress (его кладут в context.fetchOptions) идут через XMLHttpRequest.
 * Остальные запросы проходят через обычный fetch без изменений.
 */
export const progressFetch = (input: RequestInfo | URL, init: ProgressInit = {}): Promise<Response> => {
  const { onProgress, ...rest } = init
  if (!onProgress || !(rest.body instanceof FormData)) return fetch(input, rest)

  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(rest.method ?? 'POST', typeof input === 'string' ? input : String(input), true)
    xhr.withCredentials = rest.credentials === 'include'
    xhr.responseType = 'text'
    // Content-Type не ставим: браузер сам добавит boundary для FormData
    new Headers(rest.headers).forEach((value, key) => {
      if (key.toLowerCase() !== 'content-type') xhr.setRequestHeader(key, value)
    })

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ loaded: event.loaded, total: event.total })
    }
    xhr.onload = () => {
      // Конструктор Response не принимает тело для этих статусов
      const noBody = xhr.status === 204 || xhr.status === 205 || xhr.status === 304
      resolve(
        new Response(noBody ? null : xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
        }),
      )
    }
    xhr.onerror = () => reject(new TypeError('Network request failed'))
    xhr.ontimeout = () => reject(new TypeError('Network request failed'))
    xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
    rest.signal?.addEventListener('abort', () => xhr.abort())

    xhr.send(rest.body as FormData)
  })
}

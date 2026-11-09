import { useCallback, useEffect, useRef, useState } from 'react'

/** Запись длиннее не нужна: голосовое должно уложиться в лимит файла (25 МБ) с запасом. */
export const MAX_VOICE_SECONDS = 5 * 60

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  return (
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) =>
      MediaRecorder.isTypeSupported(t),
    ) ?? ''
  )
}

const extension = (mime: string) => (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm')

/**
 * Запись голосового сообщения с микрофона.
 * start() запрашивает доступ и начинает запись; stop() возвращает готовый файл; cancel() выбрасывает запись.
 */
export const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const finish = useRef<((file: File | null) => void) | null>(null)

  const release = useCallback(() => {
    window.clearInterval(timer.current)
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    recorder.current = null
    setRecording(false)
    setSeconds(0)
  }, [])

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!pickMime()

  const start = useCallback(async () => {
    setError('')
    if (!supported) {
      setError('Браузер не поддерживает запись голоса')
      return false
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Нет доступа к микрофону. Разрешите его в настройках браузера')
      return false
    }
    const mime = pickMime()
    const media = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
    chunks.current = []
    media.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data)
    media.onstop = () => {
      const type = media.mimeType || mime || 'audio/webm'
      const file = chunks.current.length
        ? new File(chunks.current, `Голосовое сообщение.${extension(type)}`, { type })
        : null
      chunks.current = []
      release()
      finish.current?.(file)
      finish.current = null
    }
    recorder.current = media
    media.start()
    setRecording(true)
    const startedAt = Date.now()
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_VOICE_SECONDS && media.state === 'recording') media.stop()
    }, 250)
    return true
  }, [release, supported])

  /** Останавливает запись и отдаёт файл (null, если записать ничего не удалось). */
  const stop = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        const media = recorder.current
        if (!media || media.state === 'inactive') return resolve(null)
        finish.current = resolve
        media.stop()
      }),
    [],
  )

  const cancel = useCallback(() => {
    const media = recorder.current
    finish.current = null
    chunks.current = []
    if (media && media.state !== 'inactive') {
      // Сбрасываем обработчик, чтобы отменённая запись не превратилась в файл
      media.onstop = null
      media.stop()
    }
    release()
  }, [release])

  // Ушли со страницы во время записи: микрофон должен выключиться
  useEffect(() => cancel, [cancel])

  return { supported, recording, seconds, error, start, stop, cancel }
}

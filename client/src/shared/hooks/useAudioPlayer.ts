import { useCallback, useEffect, useRef, useState } from 'react'
import useSound from 'use-sound'

export const useAudioPlayer = (audioUrl: string) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [play, { pause, duration, sound }] = useSound(audioUrl)
  const [currTime, setCurrTime] = useState({ min: '00', sec: '00' })
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>(null)
  const isSeekingRef = useRef(false) // Флаг перемотки
  const pendingPlayRef = useRef(false) // Флаг ожидающего воспроизведения
  const rangeRef = useRef<HTMLInputElement>(null)

  // Форматирование времени с ведущими нулями
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return {
      min: mins.toString().padStart(2, '0'),
      sec: secs.toString().padStart(2, '0'),
    }
  }, [])

  // Обновление времени при воспроизведении
  useEffect(() => {
    if (!sound || !isPlaying || isSeekingRef.current) return
    //@ts-ignore
    intervalRef.current = setInterval(() => {
      const currentPos = sound.seek([])
      setSeconds(currentPos)
      setCurrTime(formatTime(currentPos))
    }, 50)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sound, isPlaying, isSeekingRef.current, formatTime])

  // Обработка конца трека
  useEffect(() => {
    if (!sound) return

    const handleEnd = () => {
      setIsPlaying(false)
      setSeconds(0)
      setCurrTime({ min: '00', sec: '00' })
    }

    sound.on('end', handleEnd)
    return () => sound.off('end', handleEnd)
  }, [sound])

  const playingButton = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      play()
      setIsPlaying(true)
    }
  }, [isPlaying, play, pause])

  // Обработчик перемотки с защитой от наложения
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseFloat(e.target.value)
      const total = duration ? Math.floor(duration / 1000) : 0

      // Вычисляем процент прогресса
      const pct = total > 0 ? (newTime / total) * 100 : 0
      // Устанавливаем CSS‑переменную
      if (rangeRef.current) {
        rangeRef.current.style.setProperty('--range-pct', `${pct}%`)
      }
      // Устанавливаем флаг перемотки
      isSeekingRef.current = true
      pendingPlayRef.current = isPlaying // Запоминаем, нужно ли продолжить воспроизведение

      // Приостанавливаем воспроизведение
      if (isPlaying) {
        pause()
      }

      // Перематываем на новую позицию
      sound?.seek([newTime])
      setSeconds(newTime)
      setCurrTime(formatTime(newTime))

      // Через небольшой интервал продолжаем воспроизведение, если нужно
      setTimeout(() => {
        if (pendingPlayRef.current && sound) {
          play()
          setIsPlaying(true)
        }
        // Сбрасываем флаги
        isSeekingRef.current = false
        pendingPlayRef.current = false
      }, 100)
    },
    [sound, isPlaying, pause, play, formatTime],
  )

  // Расчёт длительности трека
  const totalDuration = duration ? Math.floor(duration / 1000) : 0
  const durationFormatted = formatTime(totalDuration)

  return {
    isPlaying,
    currTime,
    seconds,
    totalDuration,
    durationFormatted,
    playingButton,
    handleSeek,
    rangeRef,
  }
}

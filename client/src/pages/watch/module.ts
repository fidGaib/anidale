import { ChangeEvent, RefObject } from 'react'
import { create } from 'zustand'

interface ControlVideoTypes {
  playing: boolean
  volume: number
  muted: boolean
  playbackRate: number
  buffering: boolean
  loadedSeconds: number
  playedSeconds: number
  duration: number
  screenfull: boolean
  handle__play: () => void
  handle__volume: (e: ChangeEvent<HTMLInputElement>) => void
  toggleMute: () => void
  changeVolume: (delta: number) => void
  handle__rate: (rate: number) => void
  setBuffering: (value: boolean) => void
  handle__progress: (state: ProgressState) => void
  handle__duration: (seconds: number) => void
  resetProgress: () => void
  handle_prodress_track: (seconds: string | number, ref__player: RefObject<Seekable>) => void
}

/** Состояние воспроизведения, которое присылает плеер. */
export interface ProgressState {
  playedSeconds: number
  loadedSeconds: number
}

/** Всё, что нужно от плеера для перемотки. */
export interface Seekable {
  seekTo: (seconds: number) => void
}

const VOLUME_KEY = 'anidale:player:volume'
const RATE_KEY = 'anidale:player:rate'

// Настройки плеера переживают перезагрузку: громкость и скорость привычнее не выбирать заново
const readNumber = (key: string, fallback: number, min: number, max: number) => {
  if (typeof window === 'undefined') return fallback
  const value = Number(window.localStorage.getItem(key))
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback
}

const persist = (key: string, value: number) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Приватный режим может запрещать localStorage — плеер всё равно должен работать
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const round = (value: number) => Math.round(value * 100) / 100

export const usePayerStore = create<ControlVideoTypes>()((set, get) => ({
  playing: false,
  // Не начинаем с нулевой громкости: иначе серия «не работает» без звука
  volume: readNumber(VOLUME_KEY, 1, 0, 1),
  muted: false,
  playbackRate: readNumber(RATE_KEY, 1, 0.25, 3),
  buffering: false,
  loadedSeconds: 1,
  playedSeconds: 0,
  duration: 0,
  screenfull: false,
  handle__play() {
    set(() => ({
      playing: !get().playing,
    }))
  },
  handle__volume(e) {
    const volume = clamp(Number(e.target.value), 0, 1)
    persist(VOLUME_KEY, volume)
    set(() => ({
      volume,
      muted: volume === 0,
    }))
  },
  toggleMute() {
    const { muted, volume } = get()
    if (muted && volume === 0) {
      // Выключенный до нуля звук возвращаем на слышимый уровень
      persist(VOLUME_KEY, 0.8)
      set(() => ({ muted: false, volume: 0.8 }))
      return
    }
    set(() => ({ muted: !muted }))
  },
  changeVolume(delta) {
    const volume = round(clamp(get().volume + delta, 0, 1))
    persist(VOLUME_KEY, volume)
    set(() => ({
      volume,
      muted: volume === 0,
    }))
  },
  handle__rate(rate) {
    const playbackRate = clamp(rate, 0.25, 3)
    persist(RATE_KEY, playbackRate)
    set(() => ({ playbackRate }))
  },
  setBuffering(buffering) {
    set(() => ({ buffering }))
  },
  handle__progress({ playedSeconds, loadedSeconds }) {
    set(() => ({ playedSeconds, loadedSeconds }))
  },
  handle__duration(duration) {
    set(() => ({ duration }))
  },
  resetProgress() {
    set(() => ({ playedSeconds: 0, loadedSeconds: 1, duration: 0, buffering: false }))
  },
  handle_prodress_track(seconds, ref__player) {
    ref__player.current?.seekTo(Number(seconds))
  },
}))

import { ChangeEvent, RefObject } from 'react'
import { create } from 'zustand'

interface ControlVideoTypes {
  playing: boolean
  volume: number
  loadedSeconds: number
  playedSeconds: number
  screenfull: boolean
  handle__play: () => void
  handle__volume: (e: ChangeEvent<HTMLInputElement>) => void
  handle__progress: (state: ProgressState) => void
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
export const usePayerStore = create<ControlVideoTypes>()((set, get) => ({
  playing: false,
  volume: 0,
  loadedSeconds: 1,
  playedSeconds: 0,
  screenfull: false,
  handle__play() {
    set(() => ({
      playing: !get().playing,
    }))
  },
  handle__volume(e) {
    set(() => ({
      volume: Number(e.target.value),
    }))
  },
  handle__progress({ playedSeconds, loadedSeconds }) {
    set(() => ({ playedSeconds, loadedSeconds }))
  },
  handle_prodress_track(seconds, ref__player) {
    ref__player.current?.seekTo(Number(seconds))
  },
}))

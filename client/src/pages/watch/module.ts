import { ChangeEvent } from 'react'
import { create } from 'zustand'

export interface DataTypes {
  title: string
  src: string
  desc: string
}
export const dataAnime: DataTypes[] = [
  {
    title: 'Башня бога',
    src: '/grand blue/1.mkv',
    desc: `Lorem ipsum dolor sit amet consectetur, adipisicing elit. Voluptatem ullam similique, facilis officia maxime
      nemo quo ratione necessitatibus numquam illo deserunt, esse totam ipsa nostrum quasi dolore. Facilis, incidunt
      voluptatibus.`,
  },
]
interface ControlVideoTypes {
  playing: boolean
  volume: number
  loadedSeconds: number
  playedSeconds: number
  screenfull: boolean
  handle__play: () => void
  handle__volume: (e: ChangeEvent<HTMLInputElement>) => void
  handle__progress: (e: any) => void
  handle_prodress_track: (e: ChangeEvent<HTMLInputElement>, ref__player: any) => void
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
  handle__progress(e) {
    console.log(e)
    set(() => ({
      ...e,
    }))
  },
  handle_prodress_track(e, ref__player) {
    ref__player.current.seekTo(Number(e))
  },
}))

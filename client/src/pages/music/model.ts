import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { client } from '@/app/providers/apollo-client'
import { MAX_AUDIO_SIZE, Track, toTrack, useMusicStore } from '@/features/music/module'
import { ADD_MUSIC, ALL_MUSIC, CREATE_MUSIC, MUSIC_BY_USER, REMOVE_MUSIC } from '@/shared/graphql/schema'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'

/**
 * Страница музыки в духе VK: каталог и своя музыка приходят с сервера, а плейлисты,
 * «мне нравится» и недавно прослушанное пока живут только в браузере (localStorage).
 * Когда появится серверная часть, хранилище заменится запросами без правки разметки.
 */

/** Разделы страницы. Плейлист открывается как `playlist:<id>`. */
export type MusicSection = 'my' | 'wave' | 'liked' | 'recent' | 'playlists' | `playlist:${number}`

export interface Playlist {
  id: number
  title: string
  tracks: Track[]
  createdAt: number
}

const PAGE_SIZE = 50

/** Трек считаем тем же самым по файлу: копии в разных профилях — один и тот же трек. */
export const sameTrack = (a: Track, b: Track) => a.file !== '' && a.file === b.file

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Что-то пошло не так')

const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '') || name

/** Перемешивание копии списка: волна не должна совпадать с каталогом по порядку. */
export const shuffle = <T,>(list: T[]): T[] => {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const upsertFront = (list: Track[], track: Track, limit?: number) => {
  const result = [track, ...list.filter((item) => !sameTrack(item, track))]
  return limit ? result.slice(0, limit) : result
}

interface MusicPageStore {
  /** Треки текущего пользователя: загруженные им и добавленные из каталога. */
  myTracks: Track[]
  /** Каталог сайта без повторов файлов: источник волны и поиска. */
  catalog: Track[]
  /** Очередь волны: перемешанный каталог, обновляется кнопкой. */
  wave: Track[]
  /** Для кого загружен список: при смене пользователя данные перезапрашиваются. */
  loadedFor: number | null
  loading: boolean
  error: string
  notice: string
  uploading: boolean
  uploadPercent: number | null
  uploadLabel: string
  /** Хранится в браузере. */
  liked: Track[]
  recent: Track[]
  playlists: Playlist[]
  load: (myId: number) => Promise<void>
  shuffleWave: () => void
  toggleLike: (track: Track) => void
  markPlayed: (track: Track) => void
  createPlaylist: (title: string) => number | null
  renamePlaylist: (id: number, title: string) => void
  deletePlaylist: (id: number) => void
  addToPlaylist: (playlistId: number, track: Track) => void
  removeFromPlaylist: (playlistId: number, trackId: number) => void
  upload: (files: FileList | File[]) => Promise<void>
  addToMine: (track: Track) => Promise<void>
  removeTrack: (track: Track) => Promise<void>
  /** Короткое сообщение об успехе; сбрасывается само. */
  flash: (text: string) => void
  clearError: () => void
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

export const useMusicPageStore = create<MusicPageStore>()(
  persist(
    (set, get) => {
      /** Убирает трек из всех локальных списков: после удаления с сервера он больше не существует. */
      const forget = (track: Track) =>
        set((state) => ({
          myTracks: state.myTracks.filter((item) => item.id !== track.id && !sameTrack(item, track)),
          catalog: state.catalog.filter((item) => !sameTrack(item, track)),
          wave: state.wave.filter((item) => !sameTrack(item, track)),
          liked: state.liked.filter((item) => !sameTrack(item, track)),
          recent: state.recent.filter((item) => !sameTrack(item, track)),
          playlists: state.playlists.map((playlist) => ({
            ...playlist,
            tracks: playlist.tracks.filter((item) => !sameTrack(item, track)),
          })),
        }))

      return {
        myTracks: [],
        catalog: [],
        wave: [],
        loadedFor: null,
        loading: false,
        error: '',
        notice: '',
        uploading: false,
        uploadPercent: null,
        uploadLabel: '',
        liked: [],
        recent: [],
        playlists: [],

        load: async (myId) => {
          set({ loading: true, error: '' })
          try {
            const [all, mine] = await Promise.all([
              client.query({
                query: ALL_MUSIC,
                variables: { limit: PAGE_SIZE, page: 0 },
                fetchPolicy: 'network-only',
              }),
              client.query({
                query: MUSIC_BY_USER,
                variables: { id: myId, limit: PAGE_SIZE, page: 0 },
                fetchPolicy: 'network-only',
              }),
            ])
            const catalog = (all.data.getAllMusic ?? []).map(toTrack).filter((track) => track.url)
            const myTracks = (mine.data.getMusic ?? []).map(toTrack).filter((track) => track.url)
            set((state) => ({
              catalog,
              myTracks,
              // Перемешиваем только при первой загрузке: возврат на страницу не должен менять волну
              wave: state.wave.length ? state.wave : shuffle(catalog),
              loadedFor: myId,
            }))
          } catch (error) {
            set({ error: errorMessage(error) })
          } finally {
            set({ loading: false })
          }
        },

        shuffleWave: () => set((state) => ({ wave: shuffle(state.catalog) })),

        toggleLike: (track) =>
          set((state) =>
            state.liked.some((item) => sameTrack(item, track))
              ? { liked: state.liked.filter((item) => !sameTrack(item, track)) }
              : { liked: [track, ...state.liked] },
          ),

        markPlayed: (track) => set((state) => ({ recent: upsertFront(state.recent, track, 30) })),

        createPlaylist: (title) => {
          const clean = title.trim().slice(0, 80)
          if (!clean) {
            set({ error: 'Укажите название плейлиста' })
            return null
          }
          const id = Date.now()
          set((state) => ({ playlists: [{ id, title: clean, tracks: [], createdAt: id }, ...state.playlists] }))
          return id
        },

        renamePlaylist: (id, title) => {
          const clean = title.trim().slice(0, 80)
          if (!clean) {
            set({ error: 'Укажите название плейлиста' })
            return
          }
          set((state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, title: clean } : playlist,
            ),
          }))
        },

        deletePlaylist: (id) =>
          set((state) => ({ playlists: state.playlists.filter((playlist) => playlist.id !== id) })),

        addToPlaylist: (playlistId, track) => {
          const playlist = get().playlists.find((item) => item.id === playlistId)
          if (!playlist) return
          if (playlist.tracks.some((item) => sameTrack(item, track))) {
            get().flash(`«${track.title}» уже в плейлисте`)
            return
          }
          set((state) => ({
            playlists: state.playlists.map((item) =>
              item.id === playlistId ? { ...item, tracks: [...item.tracks, track] } : item,
            ),
          }))
          get().flash(`Добавлено в «${playlist.title}»`)
        },

        removeFromPlaylist: (playlistId, trackId) =>
          set((state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === playlistId
                ? { ...playlist, tracks: playlist.tracks.filter((item) => item.id !== trackId) }
                : playlist,
            ),
          })),

        upload: async (fileList) => {
          const files = Array.from(fileList)
          const errors: string[] = []
          set({ uploading: true, error: '', notice: '' })

          const valid: File[] = []
          for (const file of files) {
            if (!file.type.startsWith('audio/')) errors.push(`«${file.name}» — это не аудио`)
            else if (file.size > MAX_AUDIO_SIZE) errors.push(`«${file.name}» больше ${MAX_AUDIO_SIZE / 1024 / 1024} МБ`)
            else valid.push(file)
          }

          for (const [index, file] of valid.entries()) {
            set({ uploadPercent: 0, uploadLabel: `Загрузка ${index + 1} из ${valid.length}: ${file.name}` })
            try {
              const { data } = await client.mutate({
                mutation: CREATE_MUSIC,
                variables: { title: titleFromFile(file.name), file },
                context: {
                  fetchOptions: {
                    onProgress: (event: UploadProgressEvent) => set({ uploadPercent: toPercent(event) }),
                  },
                },
              })
              if (data?.createMusic) {
                const track = toTrack(data.createMusic)
                set((state) => ({
                  myTracks: upsertFront(state.myTracks, track),
                  catalog: upsertFront(state.catalog, track),
                }))
              }
            } catch (error) {
              errors.push(`«${file.name}»: ${errorMessage(error)}`)
            }
          }

          const added = valid.length - errors.length
          set({ uploading: false, uploadPercent: null, uploadLabel: '', error: errors.join('. ') })
          if (added > 0) get().flash(added === 1 ? 'Трек загружен' : `Загружено треков: ${added}`)
        },

        addToMine: async (track) => {
          set({ error: '' })
          try {
            const { data } = await client.mutate({ mutation: ADD_MUSIC, variables: { id: track.id } })
            if (!data?.addMusic) return
            const copy = toTrack(data.addMusic)
            set((state) => ({ myTracks: upsertFront(state.myTracks, copy) }))
            get().flash(`«${track.title}» в вашей музыке`)
          } catch (error) {
            set({ error: errorMessage(error) })
          }
        },

        removeTrack: async (track) => {
          set({ error: '' })
          try {
            await client.mutate({ mutation: REMOVE_MUSIC, variables: { id: track.id } })
          } catch (error) {
            set({ error: errorMessage(error) })
            return
          }
          const current = useMusicStore.getState().current
          if (current && sameTrack(current, track)) useMusicStore.getState().stop()
          forget(track)
          get().flash('Трек удалён')
        },

        flash: (text) => {
          set({ notice: text })
          if (noticeTimer) clearTimeout(noticeTimer)
          noticeTimer = setTimeout(() => set({ notice: '' }), 3000)
        },

        clearError: () => set({ error: '' }),
      }
    },
    {
      name: 'music_page',
      storage: createJSONStorage(() => localStorage),
      // На сервере лежат только треки; плейлисты, лайки и история — локальные
      partialize: (state) => ({ liked: state.liked, recent: state.recent, playlists: state.playlists }),
    },
  ),
)

/** Загруженные длительности: один и тот же файл не читаем дважды. */
const durationCache = new Map<string, number>()

/** Длительность трека в секундах. 0 — ещё не известна или файл не читается. */
export const useDuration = (url: string) => {
  const [duration, setDuration] = useState(() => (url ? durationCache.get(url) ?? 0 : 0))

  useEffect(() => {
    if (!url) {
      setDuration(0)
      return
    }
    const cached = durationCache.get(url)
    if (cached !== undefined) {
      setDuration(cached)
      return
    }

    let alive = true
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (value: number) => {
      // Отмена при размонтировании — не повод запоминать нулевую длительность
      if (!alive) return
      durationCache.set(url, value)
      setDuration(value)
    }
    audio.addEventListener('loadedmetadata', () =>
      done(Number.isFinite(audio.duration) ? audio.duration : 0),
    )
    audio.addEventListener('error', () => done(0))
    audio.src = url

    return () => {
      alive = false
      audio.removeAttribute('src')
      audio.load()
    }
  }, [url])

  return duration
}

/** «3:45». Пустая строка, пока длительность неизвестна. */
export const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds || 0))
  if (!total) return ''
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Постер-заглушка: у треков нет обложек, поэтому рисуем стабильный градиент по названию. */
export const coverGradient = (track: Track) => {
  let hash = 0
  const source = `${track.title}${track.artist}`
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) % 360
  const from = hash
  const to = (hash + 48) % 360
  return `linear-gradient(135deg, hsl(${from} 62% 52%), hsl(${to} 68% 38%))`
}

/** «12 треков» с правильным окончанием. */
export const tracksLabel = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'трек'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'трека'
        : 'треков'
  return `${count} ${word}`
}

/** Обновление списка при смене пользователя: чужую музыку в «моей» показывать нельзя. */
export const useMusicPageData = (myId: number | undefined) => {
  const loadedFor = useMusicPageStore((state) => state.loadedFor)
  const load = useMusicPageStore((state) => state.load)
  useEffect(() => {
    if (!myId) return
    if (loadedFor !== myId) void load(myId)
  }, [myId, loadedFor, load])
}

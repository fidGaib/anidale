import { create } from 'zustand'

import { client } from '@/app/providers/apollo-client'
import { RefreshStore } from '@/app/providers/routes/model'
import { storageUrl } from '@/shared/config'
import {
  ADD_MUSIC,
  ALL_MUSIC,
  COMMUNITY_MUSIC,
  CREATE_MUSIC,
  MUSIC_BY_USER,
  MY_MUSIC_FILES,
  REMOVE_MUSIC,
  REMOVE_MY_MUSIC,
} from '@/shared/graphql/schema'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'

export const MAX_AUDIO_SIZE = 15 * 1024 * 1024
export const MUSIC_PAGE_SIZE = 20

/** Что показываем: музыку конкретного профиля (id) или всю музыку сайта для ленты. */
export type MusicScope = number | 'all' | CommunityScope

/** Музыка сообщества: `community:<id>`. */
export type CommunityScope = `community:${number}`

/** id сообщества, если список — музыка сообщества. */
export const communityOf = (scope: MusicScope | null): number | null => {
  if (typeof scope !== 'string' || !scope.startsWith('community:')) return null
  const id = Number(scope.slice('community:'.length))
  return Number.isInteger(id) && id > 0 ? id : null
}

export const isValidScope = (scope: MusicScope): boolean =>
  scope === 'all' || communityOf(scope) !== null || (typeof scope === 'number' && Number.isFinite(scope))

export interface Track {
  id: number
  title: string
  artist: string
  /** Ссылка на файл в хранилище сервера. */
  url: string
  /** Путь файла в хранилище: по нему определяем, что трек уже есть у пользователя. */
  file: string
  size: number
  ownerId: number
  ownerLogin: string
}

interface RawTrack {
  id?: number | null
  title?: string | null
  artist?: string | null
  file?: string | null
  size?: number | null
  user?: { id?: number | null; login?: string | null } | null
}

export const toTrack = (track: RawTrack): Track => ({
  id: track.id ?? 0,
  title: track.title ?? '',
  artist: track.artist ?? '',
  url: track.file ? storageUrl(track.file) : '',
  file: track.file ?? '',
  size: track.size ?? 0,
  ownerId: track.user?.id ?? 0,
  ownerLogin: track.user?.login ?? '',
})

interface MusicStore {
  /** Какой список загружен сейчас. */
  scope: MusicScope | null
  tracks: Track[]
  /** id треков, которые уже добавлены в свой профиль в этой сессии. */
  addedIds: number[]
  /** Файлы всех треков текущего пользователя (для пометки «уже у вас»). */
  myFiles: string[]
  /** Короткое сообщение об успехе («Добавлено в ваш профиль»). */
  notice: string
  hasMore: boolean
  loading: boolean
  uploading: boolean
  /** Процент отправки текущего файла и подпись («Загрузка 2 из 3»); null, когда загрузки нет. */
  uploadPercent: number | null
  uploadLabel: string
  currentId: number | null
  /** Играющий трек. Хранится отдельно от списка на экране: список можно сменить, музыка продолжит играть. */
  current: Track | null
  /** Очередь воспроизведения: копия списка на момент запуска трека. */
  queue: Track[]
  isPlaying: boolean
  error: string
  /** Позиция и длительность текущего трека, секунды. */
  currentTime: number
  duration: number
  load: (scope: MusicScope) => Promise<void>
  loadMore: () => Promise<void>
  addFiles: (files: FileList | File[]) => Promise<void>
  /** Копирует чужой трек в свой профиль. myId — id текущего пользователя. */
  addToMine: (id: number, myId: number) => Promise<void>
  removeTrack: (id: number) => Promise<void>
  /** Убирает трек (по файлу) из своего профиля: и свой, и добавленную копию. */
  removeMine: (file: string, myId: number) => Promise<void>
  toggle: (id: number) => void
  /**
   * Играет трек вне списков музыки (например, аудио из сообщения) через тот же плеер.
   * queue — набор треков для «вперёд/назад» и автоперехода; по умолчанию очередь из одного трека.
   */
  playOne: (track: Track, queue?: Track[]) => void
  /** Пауза/продолжить текущий трек, откуда бы он ни был запущен (список, сообщение). */
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  /** Останавливает воспроизведение и закрывает мини-плеер; открытый список остаётся. */
  stop: () => void
  /** Останавливает плеер и очищает всё состояние (выход из аккаунта, смена пользователя). */
  reset: () => void
}

// Один общий проигрыватель на всё приложение: одновременно играет только один трек.
// Ссылка хранится в globalThis, чтобы при горячей замене модуля в dev
// предыдущий Audio не оставался играть «сиротой» поверх нового.
const playerHost = globalThis as typeof globalThis & { __anidaleAudio?: HTMLAudioElement }
playerHost.__anidaleAudio?.pause()
playerHost.__anidaleAudio = undefined
let audio: HTMLAudioElement | null = null
// Номер текущего запроса списка: ответы устаревших запросов игнорируются.
let loadToken = 0
let nextPage = 0

const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '') || name

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Что-то пошло не так')

export const useMusicStore = create<MusicStore>()((set, get) => {
  const getAudio = () => {
    if (audio) return audio
    const player = new Audio()
    player.preload = 'metadata'
    playerHost.__anidaleAudio = player
    // Состояние берём из событий самого плеера, а не угадываем по промисам play():
    // при быстром переключении треков play() предыдущего трека отклоняется с AbortError.
    player.addEventListener('play', () => set({ isPlaying: true }))
    player.addEventListener('pause', () => set({ isPlaying: false }))
    player.addEventListener('timeupdate', () => set({ currentTime: player.currentTime }))
    player.addEventListener('loadedmetadata', () =>
      set({ duration: Number.isFinite(player.duration) ? player.duration : 0 }),
    )
    player.addEventListener('ended', () => {
      // Автопереход к следующему треку; на последнем останавливаемся.
      if (!step(1, false)) set({ isPlaying: false, currentTime: 0 })
    })
    player.addEventListener('error', () => set({ isPlaying: false, error: 'Не удалось воспроизвести трек' }))
    audio = player
    return player
  }

  const playTrack = (track: Track) => {
    const player = getAudio()
    player.src = track.url
    set({ current: track, currentId: track.id, currentTime: 0, duration: 0, error: '' })
    void player.play().catch((error: unknown) => {
      // AbortError: запуск прерван переключением на другой трек — это не ошибка
      if ((error as DOMException)?.name !== 'AbortError') set({ isPlaying: false })
    })
  }

  /** Переключает на соседний трек. wrap — перейти по кругу, если соседа нет. Возвращает false, если переходить некуда. */
  const step = (dir: 1 | -1, wrap: boolean): boolean => {
    // Переходим по очереди, а не по списку на экране
    const { queue, currentId } = get()
    const index = queue.findIndex((t) => t.id === currentId)
    if (index === -1 || queue.length === 0) return false
    let target = queue[index + dir]
    if (!target && wrap) target = dir === 1 ? queue[0] : queue[queue.length - 1]
    if (!target || target.id === currentId) return false
    playTrack(target)
    return true
  }

  const fetchPage = async (scope: MusicScope, page: number) => {
    if (scope === 'all') {
      const { data } = await client.query({
        query: ALL_MUSIC,
        variables: { limit: MUSIC_PAGE_SIZE, page },
        fetchPolicy: 'network-only',
      })
      return (data.getAllMusic ?? []).map(toTrack)
    }
    const communityId = communityOf(scope)
    if (communityId !== null) {
      const { data } = await client.query({
        query: COMMUNITY_MUSIC,
        variables: { id: communityId, limit: MUSIC_PAGE_SIZE, page },
        fetchPolicy: 'network-only',
      })
      return (data.getCommunityMusic ?? []).map(toTrack)
    }
    if (typeof scope !== 'number') return []
    const { data } = await client.query({
      query: MUSIC_BY_USER,
      variables: { id: scope, limit: MUSIC_PAGE_SIZE, page },
      fetchPolicy: 'network-only',
    })
    return (data.getMusic ?? []).map(toTrack)
  }

  const loadMyFiles = async () => {
    // Без входа «своих» треков нет
    if (!RefreshStore.getState().refreshData.id) {
      set({ myFiles: [] })
      return
    }
    try {
      const { data } = await client.query({ query: MY_MUSIC_FILES, fetchPolicy: 'network-only' })
      set({ myFiles: data.myMusicFiles ?? [] })
    } catch {
      // Пометки — удобство, без них список всё равно работает (сервер отклонит повторное добавление)
    }
  }

  return {
    scope: null,
    myFiles: [],
    addedIds: [],
    notice: '',
    tracks: [],
    hasMore: false,
    loading: false,
    uploading: false,
    uploadPercent: null,
    uploadLabel: '',
    currentId: null,
    current: null,
    queue: [],
    isPlaying: false,
    error: '',
    currentTime: 0,
    duration: 0,

    load: async (scope) => {
      const token = ++loadToken
      // Другой список: очищаем показываемые треки, чтобы не мелькали чужие.
      // Играющая музыка и её очередь не трогаются: они живут отдельно (current/queue).
      if (get().scope !== scope) {
        set({ scope, tracks: [], hasMore: false, notice: '' })
      }
      nextPage = 0
      set({ loading: true, error: '' })
      void loadMyFiles()
      try {
        const tracks = await fetchPage(scope, 0)
        if (token !== loadToken) return
        nextPage = 1
        set({ tracks, hasMore: tracks.length === MUSIC_PAGE_SIZE })
      } catch (error) {
        if (token === loadToken) set({ error: errorMessage(error) })
      } finally {
        if (token === loadToken) set({ loading: false })
      }
    },

    loadMore: async () => {
      const { scope, hasMore, loading } = get()
      if (scope === null || !hasMore || loading) return
      const token = loadToken
      set({ loading: true })
      try {
        const next = await fetchPage(scope, nextPage)
        if (token !== loadToken) return
        nextPage += 1
        set((state) => {
          const ids = new Set(state.tracks.map((t) => t.id))
          return {
            tracks: [...state.tracks, ...next.filter((t) => !ids.has(t.id))],
            hasMore: next.length === MUSIC_PAGE_SIZE,
          }
        })
      } catch (error) {
        if (token === loadToken) set({ error: errorMessage(error) })
      } finally {
        if (token === loadToken) set({ loading: false })
      }
    },

    addFiles: async (fileList) => {
      const files = Array.from(fileList)
      const errors: string[] = []
      set({ uploading: true, error: '' })

      // Сначала отбираем подходящие файлы: счётчик «2 из 3» считается только по ним
      const valid: File[] = []
      for (const file of files) {
        if (!file.type.startsWith('audio/')) errors.push(`«${file.name}» — это не аудио`)
        else if (file.size > MAX_AUDIO_SIZE) errors.push(`«${file.name}» больше ${MAX_AUDIO_SIZE / 1024 / 1024} МБ`)
        else valid.push(file)
      }

      // Последовательно: сервер обрабатывает файл целиком, параллельная отправка только забьёт канал.
      for (const [index, file] of valid.entries()) {
        set({ uploadPercent: 0, uploadLabel: `Загрузка ${index + 1} из ${valid.length}: ${file.name}` })
        try {
          const { data } = await client.mutate({
            mutation: CREATE_MUSIC,
            variables: { title: titleFromFile(file.name), file, communityId: communityOf(get().scope) ?? undefined },
            context: {
              fetchOptions: { onProgress: (event: UploadProgressEvent) => set({ uploadPercent: toPercent(event) }) },
            },
          })
          if (data?.createMusic) {
            const track = toTrack(data.createMusic)
            set((state) =>
              state.tracks.some((t) => t.id === track.id)
                ? state
                : { tracks: [track, ...state.tracks], myFiles: [...state.myFiles, track.file] },
            )
          }
        } catch (error) {
          errors.push(`«${file.name}»: ${errorMessage(error)}`)
        }
      }
      set({ uploading: false, uploadPercent: null, uploadLabel: '', error: errors.join('. ') })
    },

    addToMine: async (id, myId) => {
      set({ error: '', notice: '' })
      try {
        const { data } = await client.mutate({ mutation: ADD_MUSIC, variables: { id } })
        set((state) => {
          const file = state.tracks.find((t) => t.id === id)?.file
          const patch: Partial<MusicStore> = {
            addedIds: [...state.addedIds, id],
            myFiles: file ? [...state.myFiles, file] : state.myFiles,
            notice: 'Добавлено в ваш профиль',
          }
          // Открыт свой профиль: новый трек сразу появляется в списке
          if (data?.addMusic && state.scope === myId) {
            const track = toTrack(data.addMusic)
            if (!state.tracks.some((t) => t.id === track.id)) patch.tracks = [track, ...state.tracks]
          }
          return patch
        })
      } catch (error) {
        set({ error: errorMessage(error) })
      }
    },

    removeTrack: async (id) => {
      try {
        await client.mutate({ mutation: REMOVE_MUSIC, variables: { id } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return
      }
      // Удалили играющий трек: останавливаем плеер
      if (get().currentId === id) get().stop()
      set((state) => {
        const removed = state.tracks.find((t) => t.id === id)
        return {
          tracks: state.tracks.filter((t) => t.id !== id),
          queue: state.queue.filter((t) => t.id !== id),
          myFiles: removed ? state.myFiles.filter((f) => f !== removed.file) : state.myFiles,
        }
      })
    },

    removeMine: async (file, myId) => {
      set({ error: '', notice: '' })
      try {
        await client.mutate({ mutation: REMOVE_MY_MUSIC, variables: { file } })
      } catch (error) {
        set({ error: errorMessage(error) })
        return
      }
      // Играет именно удалённая запись пользователя: останавливаем
      const current = get().current
      if (current && current.file === file && current.ownerId === myId) get().stop()
      // Убираем его записи в показанном списке и очереди; чужие записи с тем же файлом остаются
      const isMine = (t: Track) => t.file === file && t.ownerId === myId
      set((state) => ({
        tracks: state.tracks.filter((t) => !isMine(t)),
        queue: state.queue.filter((t) => !isMine(t)),
        myFiles: state.myFiles.filter((f) => f !== file),
        // Трек можно будет добавить снова
        addedIds: state.addedIds.filter((id) => !state.tracks.some((t) => t.id === id && t.file === file)),
        notice: 'Трек удалён из вашего профиля',
      }))
    },

    toggle: (id) => {
      const track = get().tracks.find((t) => t.id === id)
      if (!track || !track.url) return
      const player = getAudio()

      // Тот же трек: пауза/продолжить.
      if (get().currentId === id) {
        if (player.paused) void player.play().catch(() => undefined)
        else player.pause()
        return
      }

      // Другой трек: очередь обновляется списком, из которого его запустили, а src
      // заменяется у того же плеера, поэтому два трека одновременно играть не могут.
      set({ queue: [...get().tracks] })
      playTrack(track)
    },

    playOne: (track, queue) => {
      if (!track.url) return
      const player = getAudio()
      // Тот же трек: пауза/продолжить
      if (get().currentId === track.id) {
        if (player.paused) void player.play().catch(() => undefined)
        else player.pause()
        return
      }
      // Очередь обязательно содержит сам трек, иначе «вперёд/назад» не найдёт текущую позицию
      const list = queue && queue.some((t) => t.id === track.id) ? queue : [track]
      set({ queue: list })
      playTrack(track)
    },

    togglePlay: () => {
      if (!audio || !get().current) return
      if (audio.paused) void audio.play().catch(() => undefined)
      else audio.pause()
    },

    next: () => {
      step(1, true)
    },

    prev: () => {
      // Как в обычных плеерах: после первых секунд «назад» начинает трек заново.
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0
        return
      }
      if (!step(-1, true) && audio) audio.currentTime = 0
    },

    seek: (seconds) => {
      if (!audio || !Number.isFinite(seconds)) return
      audio.currentTime = seconds
      set({ currentTime: seconds })
    },

    stop: () => {
      if (audio) {
        audio.pause()
        // Снимаем источник, чтобы браузер перестал качать файл
        audio.removeAttribute('src')
        audio.load()
      }
      set({ current: null, currentId: null, queue: [], isPlaying: false, currentTime: 0, duration: 0 })
    },

    reset: () => {
      // Ответы запросов, ушедших до сброса, больше не нужны
      loadToken++
      nextPage = 0
      get().stop()
      set({
        scope: null,
        myFiles: [],
        addedIds: [],
        notice: '',
        tracks: [],
        hasMore: false,
        loading: false,
        uploading: false,
        uploadPercent: null,
        uploadLabel: '',
        error: '',
      })
    },
  }
})

// Выход из аккаунта (id → 0) или вход под другим пользователем: музыка прошлого пользователя
// не должна играть дальше. Первое появление id (0 → X при восстановлении сессии) не сбрасываем,
// иначе пропал бы уже загруженный список.
const unsubscribeSession = RefreshStore.subscribe((state, prev) => {
  const prevId = prev.refreshData.id
  if (prevId && state.refreshData.id !== prevId) useMusicStore.getState().reset()
})
// При горячей замене модуля убираем старую подписку, иначе их накопится несколько
import.meta.hot?.dispose(unsubscribeSession)

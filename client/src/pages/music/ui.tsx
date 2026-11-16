import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import { Track, useMusicStore } from '@/features/music/module'
import Content from '@/shared/content'
import { Btn } from '@/shared/ui/btn'
import { Empty, FormError } from '@/shared/ui/notice'
import { UploadProgress } from '@/shared/ui/progress'

import {
  AddToPlaylistDialog,
  CreatePlaylistDialog,
  DeletePlaylistDialog,
  RenamePlaylistDialog,
} from './dialogs'
import {
  ClockIcon,
  DiscIcon,
  EditIcon,
  HeartIcon,
  NoteIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  ShuffleIcon,
  TrashIcon,
  UploadIcon,
  WaveIcon,
} from './icons'
import {
  MusicSection,
  Playlist,
  coverGradient,
  shuffle,
  tracksLabel,
  useMusicPageData,
  useMusicPageStore,
} from './model'
import { MusicPlayerBar } from './player'
import { TrackRow } from './track-row'
import cl from './ui.module.css'

const titles: Record<string, string> = {
  my: 'Моя музыка',
  wave: 'Волна',
  liked: 'Мне нравится',
  recent: 'Недавно прослушанные',
  playlists: 'Плейлисты',
}

/** Треки без повторов по файлу: в каталоге и «моей музыке» бывают одни и те же записи. */
const dedupe = (list: Track[]) => {
  const files = new Set<string>()
  return list.filter((track) => {
    if (!track.file || files.has(track.file)) return false
    files.add(track.file)
    return true
  })
}

/** Страница музыки в духе VK: разделы слева, список треков и нижний плеер. */
export const Music = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const myId = useRefreshStore((store) => store.refreshData.id)
  useMusicPageData(myId)

  const myTracks = useMusicPageStore((s) => s.myTracks)
  const catalog = useMusicPageStore((s) => s.catalog)
  const wave = useMusicPageStore((s) => s.wave)
  const liked = useMusicPageStore((s) => s.liked)
  const recent = useMusicPageStore((s) => s.recent)
  const playlists = useMusicPageStore((s) => s.playlists)
  const loading = useMusicPageStore((s) => s.loading)
  const error = useMusicPageStore((s) => s.error)
  const notice = useMusicPageStore((s) => s.notice)
  const uploading = useMusicPageStore((s) => s.uploading)
  const uploadPercent = useMusicPageStore((s) => s.uploadPercent)
  const uploadLabel = useMusicPageStore((s) => s.uploadLabel)
  const upload = useMusicPageStore((s) => s.upload)
  const shuffleWave = useMusicPageStore((s) => s.shuffleWave)
  const flash = useMusicPageStore((s) => s.flash)
  const clearError = useMusicPageStore((s) => s.clearError)

  const playOne = useMusicStore((s) => s.playOne)
  const markPlayed = useMusicPageStore((s) => s.markPlayed)
  const hasPlayer = useMusicStore((s) => s.current !== null)

  const [section, setSection] = useState<MusicSection>('my')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [addTrack, setAddTrack] = useState<Track | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'AniDale - Музыка'
  }, [])

  useEffect(() => {
    clearError()
  }, [section, clearError])

  const playlistId = section.startsWith('playlist:') ? Number(section.slice('playlist:'.length)) : null
  const playlist = playlistId !== null ? playlists.find((item) => item.id === playlistId) ?? null : null
  // Плейлист удалили или он открыт по старой ссылке — показываем общий список
  const activeSection: MusicSection = playlistId !== null && !playlist ? 'playlists' : section

  const sectionTracks: Track[] = playlist
    ? playlist.tracks
    : activeSection === 'my'
      ? myTracks
      : activeSection === 'wave'
        ? wave
        : activeSection === 'liked'
          ? liked
          : activeSection === 'recent'
            ? recent
            : []

  const search = query.trim().toLocaleLowerCase('ru')
  const found = useMemo(() => {
    if (!search) return null
    return dedupe([...catalog, ...myTracks]).filter(
      (track) =>
        track.title.toLocaleLowerCase('ru').includes(search) ||
        track.artist.toLocaleLowerCase('ru').includes(search),
    )
  }, [search, catalog, myTracks])

  const tracks = found ?? sectionTracks
  const playingTitle = search ? 'Результаты поиска' : playlist ? playlist.title : titles[activeSection]

  const playList = (list: Track[], randomly = false) => {
    if (!list.length) return
    const queue = randomly ? shuffle(list) : list
    playOne(queue[0], queue)
    markPlayed(queue[0])
  }

  const openPlaylist = (id: number) => {
    setQuery('')
    setSection(`playlist:${id}`)
  }

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <header className={cl.hero}>
          <div>
            <p className={cl.kicker}>AniDale Music</p>
            <h1 className={cl.heroTitle}>Музыка</h1>
            <p className={cl.heroText}>
              Треки, плейлисты и волна. Слушайте каталог сайта, собирайте подборки и возвращайтесь к любимому.
            </p>
          </div>
          <div className={cl.heroActions}>
            <Btn variant='primary' onClick={() => fileInput.current?.click()} disabled={uploading}>
              <UploadIcon width={18} height={18} /> Загрузить треки
            </Btn>
            <Btn
              onClick={() => {
                setQuery('')
                setSection('wave')
              }}
            >
              <WaveIcon width={18} height={18} /> Волна
            </Btn>
          </div>
        </header>

        <input
          ref={fileInput}
          type='file'
          hidden
          multiple
          accept='audio/*'
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files)
            e.target.value = ''
          }}
        />

        {error && <FormError>{error}</FormError>}
        {notice && <p className={cl.notice}>{notice}</p>}
        {uploading && uploadPercent !== null && <UploadProgress percent={uploadPercent} label={uploadLabel} />}

        <div className={cl.layout}>
          <aside className={cl.side}>
            <nav className={cl.sideCard} aria-label='Разделы музыки'>
              <SideLink
                active={!search && activeSection === 'my'}
                icon={<NoteIcon />}
                label='Моя музыка'
                count={myTracks.length}
                onClick={() => {
                  setQuery('')
                  setSection('my')
                }}
              />
              <SideLink
                active={!search && activeSection === 'wave'}
                icon={<WaveIcon />}
                label='Волна'
                onClick={() => {
                  setQuery('')
                  setSection('wave')
                }}
              />
              <SideLink
                active={!search && activeSection === 'liked'}
                icon={<HeartIcon />}
                label='Мне нравится'
                count={liked.length}
                onClick={() => {
                  setQuery('')
                  setSection('liked')
                }}
              />
              <SideLink
                active={!search && activeSection === 'recent'}
                icon={<ClockIcon />}
                label='Недавно'
                count={recent.length}
                onClick={() => {
                  setQuery('')
                  setSection('recent')
                }}
              />
              <SideLink
                active={!search && activeSection === 'playlists'}
                icon={<DiscIcon />}
                label='Плейлисты'
                count={playlists.length}
                onClick={() => {
                  setQuery('')
                  setSection('playlists')
                }}
              />
            </nav>

            <div className={cl.sideCard}>
              <div className={cl.sideHead}>
                <span>Мои плейлисты</span>
                <button type='button' className={cl.sideAdd} onClick={() => setCreateOpen(true)} title='Создать плейлист'>
                  <PlusIcon width={16} height={16} />
                </button>
              </div>
              {playlists.length === 0 ? (
                <p className={cl.sideHint}>Соберите первый плейлист из любого трека</p>
              ) : (
                <div className={cl.sidePlaylists}>
                  {playlists.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      className={`${cl.sidePlaylist} ${playlist?.id === item.id && !search ? cl.sidePlaylistActive : ''}`}
                      onClick={() => openPlaylist(item.id)}
                    >
                      <span
                        className={cl.sidePlaylistCover}
                        style={{ background: coverGradient(item.tracks[0] ?? emptyTrack) }}
                      >
                        <NoteIcon width={16} height={16} />
                      </span>
                      <span className={cl.sidePlaylistText}>
                        <span className={cl.sidePlaylistTitle}>{item.title}</span>
                        <span className={cl.sidePlaylistCount}>{tracksLabel(item.tracks.length)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className={cl.main}>
            <div className={cl.mainHead}>
              <div>
                <h2 className={cl.mainTitle}>{playingTitle}</h2>
                <p className={cl.mainSubtitle}>
                  {search
                    ? `${tracksLabel(tracks.length)} по запросу «${query.trim()}»`
                    : tracksLabel(tracks.length)}
                </p>
              </div>
              <div className={cl.mainActions}>
                {!search && activeSection === 'playlists' ? (
                  <Btn variant='primary' onClick={() => setCreateOpen(true)}>
                    <PlusIcon width={16} height={16} /> Создать плейлист
                  </Btn>
                ) : (
                  <>
                    {activeSection === 'wave' && (
                      <Btn onClick={shuffleWave} title='Перемешать волну заново'>
                        <ShuffleIcon width={16} height={16} /> Обновить
                      </Btn>
                    )}
                    <Btn disabled={!tracks.length} onClick={() => playList(tracks)} title='Слушать по порядку'>
                      <PlayIcon width={16} height={16} /> Слушать
                    </Btn>
                    <Btn disabled={!tracks.length} onClick={() => playList(tracks, true)} title='Слушать вперемешку'>
                      <ShuffleIcon width={16} height={16} />
                    </Btn>
                  </>
                )}
              </div>
            </div>

            <label className={cl.search}>
              <SearchIcon className={cl.searchIcon} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Поиск по названию или исполнителю'
                aria-label='Поиск музыки'
              />
              {query && (
                <button type='button' className={cl.searchClear} onClick={() => setQuery('')} aria-label='Очистить поиск'>
                  ×
                </button>
              )}
            </label>

            {!search && playlist && (
              <div className={cl.playlistHero}>
                <span className={cl.playlistCover} style={{ background: coverGradient(playlist.tracks[0] ?? emptyTrack) }}>
                  <NoteIcon width={40} height={40} />
                </span>
                <div className={cl.playlistInfo}>
                  <p className={cl.playlistKicker}>Плейлист</p>
                  <h3 className={cl.playlistTitle}>{playlist.title}</h3>
                  <p className={cl.playlistMeta}>
                    {tracksLabel(playlist.tracks.length)} · в этом браузере
                  </p>
                  <div className={cl.playlistActions}>
                    <Btn variant='primary' disabled={!playlist.tracks.length} onClick={() => playList(playlist.tracks)}>
                      <PlayIcon width={16} height={16} /> Слушать
                    </Btn>
                    <Btn disabled={!playlist.tracks.length} onClick={() => playList(playlist.tracks, true)}>
                      <ShuffleIcon width={16} height={16} />
                    </Btn>
                    <Btn onClick={() => setRenameOpen(true)} title='Переименовать'>
                      <EditIcon width={16} height={16} />
                    </Btn>
                    <Btn variant='danger' onClick={() => setDeleteOpen(true)} title='Удалить плейлист'>
                      <TrashIcon width={16} height={16} />
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {!search && activeSection === 'wave' && (
              <div className={cl.waveCard}>
                <div className={cl.waveText}>
                  <p className={cl.waveKicker}>Персональная волна</p>
                  <h3 className={cl.waveTitle}>Музыка без конца</h3>
                  <p className={cl.waveDesc}>
                    Перемешанный каталог сайта: чем чаще слушаете, тем понятнее, что включить дальше. Обновите
                    подборку, если хочется другого настроения.
                  </p>
                </div>
                <div className={cl.waveArt} aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {loading && !search && tracks.length === 0 ? (
              <Empty>Загружаем музыку…</Empty>
            ) : !search && activeSection === 'playlists' ? (
              <PlaylistGrid
                playlists={playlists}
                onOpen={openPlaylist}
                onCreate={() => setCreateOpen(true)}
                onPlay={(item) => playList(item.tracks)}
              />
            ) : tracks.length === 0 ? (
              <ListEmpty
                search={search}
                query={query}
                section={activeSection}
                playlist={playlist}
                onWave={() => {
                  setQuery('')
                  setSection('wave')
                }}
                onUpload={() => fileInput.current?.click()}
                onCreate={() => setCreateOpen(true)}
              />
            ) : (
              <div className={cl.list}>
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={tracks}
                    owned={track.ownerId === myId}
                    playlistId={search ? undefined : playlist?.id}
                    onAddToPlaylist={setAddTrack}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {hasPlayer && <div className={cl.playerSpacer} />}

        <MusicPlayerBar />

        {createOpen && (
          <CreatePlaylistDialog
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => {
              flash('Плейлист создан')
              openPlaylist(id)
            }}
          />
        )}
        {addTrack && <AddToPlaylistDialog track={addTrack} onClose={() => setAddTrack(null)} />}
        {renameOpen && playlist && (
          <RenamePlaylistDialog playlistId={playlist.id} current={playlist.title} onClose={() => setRenameOpen(false)} />
        )}
        {deleteOpen && playlist && (
          <DeletePlaylistDialog
            playlistId={playlist.id}
            title={playlist.title}
            onClose={() => setDeleteOpen(false)}
          />
        )}
      </div>
    </Content>
  )
}

/** Пустой трек для градиента: у нового плейлиста ещё нет обложки. */
const emptyTrack: Track = { id: 0, title: '', artist: '', url: '', file: '', size: 0, ownerId: 0, ownerLogin: '' }

interface SideLinkProps {
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick: () => void
}

const SideLink = ({ active, icon, label, count, onClick }: SideLinkProps) => (
  <button type='button' className={`${cl.sideLink} ${active ? cl.sideLinkActive : ''}`} onClick={onClick}>
    <span className={cl.sideLinkIcon}>{icon}</span>
    <span className={cl.sideLinkLabel}>{label}</span>
    {count !== undefined && count > 0 && <span className={cl.sideLinkCount}>{count}</span>}
  </button>
)

interface GridProps {
  playlists: Playlist[]
  onOpen: (id: number) => void
  onCreate: () => void
  onPlay: (playlist: Playlist) => void
}

/** Сетка плейлистов: обложка, название и число треков. */
const PlaylistGrid = ({ playlists, onOpen, onCreate, onPlay }: GridProps) => (
  <div className={cl.grid}>
    {playlists.map((playlist) => (
      <article className={cl.card} key={playlist.id}>
        <div className={cl.cardCoverWrap}>
          <button
            type='button'
            className={cl.cardCover}
            style={{ background: coverGradient(playlist.tracks[0] ?? emptyTrack) }}
            onClick={() => onOpen(playlist.id)}
            aria-label={`Открыть плейлист «${playlist.title}»`}
          >
            <NoteIcon width={44} height={44} />
          </button>
          {playlist.tracks.length > 0 && (
            <button
              type='button'
              className={cl.cardPlay}
              onClick={() => onPlay(playlist)}
              aria-label='Слушать плейлист'
            >
              <PlayIcon />
            </button>
          )}
        </div>
        <button type='button' className={cl.cardTitle} onClick={() => onOpen(playlist.id)}>
          {playlist.title}
        </button>
        <span className={cl.cardMeta}>{tracksLabel(playlist.tracks.length)}</span>
      </article>
    ))}
    <button type='button' className={cl.cardNew} onClick={onCreate}>
      <span className={cl.cardNewIcon}>
        <PlusIcon />
      </span>
      Создать плейлист
    </button>
  </div>
)

interface EmptyProps {
  search: string
  query: string
  section: MusicSection
  playlist: Playlist | null
  onWave: () => void
  onUpload: () => void
  onCreate: () => void
}

/** Подсказка в пустом разделе: что сделать, чтобы здесь появились треки. */
const ListEmpty = ({ search, query, section, playlist, onWave, onUpload, onCreate }: EmptyProps) => {
  if (search) {
    return (
      <div className={cl.empty}>
        <SearchIcon className={cl.emptyIcon} />
        <h3>Ничего не нашлось</h3>
        <p>По запросу «{query.trim()}» нет треков. Попробуйте другое название или исполнителя.</p>
      </div>
    )
  }
  if (playlist) {
    return (
      <div className={cl.empty}>
        <NoteIcon className={cl.emptyIcon} />
        <h3>В плейлисте пока пусто</h3>
        <p>Нажмите «+» у любого трека и выберите этот плейлист.</p>
      </div>
    )
  }
  if (section === 'my') {
    return (
      <div className={cl.empty}>
        <NoteIcon className={cl.emptyIcon} />
        <h3>Здесь будет ваша музыка</h3>
        <p>Загрузите файлы с компьютера или добавьте треки из волны и каталога.</p>
        <div className={cl.emptyActions}>
          <Btn variant='primary' onClick={onUpload}>
            <UploadIcon width={16} height={16} /> Загрузить
          </Btn>
          <Btn onClick={onWave}>Слушать волну</Btn>
        </div>
      </div>
    )
  }
  if (section === 'liked') {
    return (
      <div className={cl.empty}>
        <HeartIcon className={cl.emptyIcon} />
        <h3>Пока ничего не нравится</h3>
        <p>Нажмите на сердечко рядом с треком — он появится здесь.</p>
        <Btn onClick={onWave}>Найти музыку</Btn>
      </div>
    )
  }
  if (section === 'recent') {
    return (
      <div className={cl.empty}>
        <ClockIcon className={cl.emptyIcon} />
        <h3>Вы ещё ничего не слушали</h3>
        <p>Включите любой трек, и он появится в истории.</p>
        <Btn onClick={onWave}>Включить волну</Btn>
      </div>
    )
  }
  if (section === 'playlists') {
    return (
      <div className={cl.empty}>
        <DiscIcon className={cl.emptyIcon} />
        <h3>Плейлистов пока нет</h3>
        <p>Соберите подборку под настроение: для дороги, работы или вечера.</p>
        <Btn variant='primary' onClick={onCreate}>
          <PlusIcon width={16} height={16} /> Создать плейлист
        </Btn>
      </div>
    )
  }
  return (
    <div className={cl.empty}>
      <WaveIcon className={cl.emptyIcon} />
      <h3>В каталоге пока нет музыки</h3>
      <p>Загрузите первый трек — волна и поиск сразу оживут.</p>
      <Btn variant='primary' onClick={onUpload}>
        <UploadIcon width={16} height={16} /> Загрузить трек
      </Btn>
    </div>
  )
}

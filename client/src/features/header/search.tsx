import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { client } from '@/app/providers/apollo-client'
import { useRefreshStore } from '@/app/providers/routes/model'
import { Track, toTrack, useMusicStore } from '@/features/music/module'
import { useOpenPost } from '@/features/post-viewer'
import { assetUrl, storageUrl } from '@/shared/config'
import { SEARCH } from '@/shared/graphql/schema'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './search.module.css'

type Tab = 'all' | 'users' | 'posts' | 'music' | 'anime'

const TABS: { key: Tab; title: string }[] = [
  { key: 'all', title: 'Все' },
  { key: 'users', title: 'Люди' },
  { key: 'posts', title: 'Посты' },
  { key: 'music', title: 'Музыка' },
  { key: 'anime', title: 'Аниме' },
]

/** Сколько результатов каждого раздела на вкладке «Все» и на вкладке одного раздела. */
const PREVIEW = 4
const PAGE = 15
const RECENT_KEY = 'anidale:recent-searches'
const RECENT_MAX = 8

// Каталог аниме пока не на сервере: ищем по тому же списку, что и раньше
const ANIME = [
  { title: 'Мастера меча онлайн', preview: '/1.png', date: ' Лето • 2023 • +18' },
  { title: 'Башня бога', preview: '/2.png', date: ' Лето • 2023 • +18' },
  { title: 'Магическая битва', preview: '/5.jpg', date: ' Лето • 2023 • +18' },
  { title: 'Ванпачмен', preview: '/4.png', date: ' Лето • 2023 • +18' },
]

interface FoundUser {
  id: number
  login: string
  avatar: string
}
interface FoundPost {
  id: number
  description: string
  userId: number
  login: string
  avatar: string
  image: string
  likes: number
  comments: number
}

const loadRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
const saveRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // Хранилище недоступно: история запросов живёт до перезагрузки
  }
}

/** Подсветка совпадений запроса в тексте. */
const Mark = ({ text, query }: { text: string; query: string }) => {
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return <>{text}</>
  return (
    <>
      {text.split(new RegExp(`(${escaped})`, 'i')).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={cl.mark}>
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

const UserRow = ({ user, query, onPick }: { user: FoundUser; query: string; onPick: () => void }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  return (
    <div className={cl.row}>
      <Link to={`/profile/${user.id}`} className={cl.rowMain} onClick={onPick}>
        <ImageLoading className={cl.avatar} src={useSrcAvatar(user.avatar)} />
        <span className={cl.name}>
          <Mark text={user.login} query={query} />
        </span>
      </Link>
      {myId > 0 && user.id !== myId && (
        <Link to={`/messages/${user.id}`} className={cl.action} title='Написать сообщение' onClick={onPick}>
          <ImageLoading src={assetUrl('icons/chat.svg')} className={cl.actionIcon} />
        </Link>
      )}
    </div>
  )
}

const PostRow = ({ post, query, onPick }: { post: FoundPost; query: string; onPick: (postId: number) => void }) => (
  <div className={cl.row} onClick={() => onPick(post.id)}>
    <div className={cl.rowMain}>
      <ImageLoading className={cl.avatar} src={useSrcAvatar(post.avatar)} />
      <span className={cl.postBody}>
        <span className={cl.name}>{post.login}</span>
        <span className={cl.postText}>
          <Mark text={post.description.slice(0, 160)} query={query} />
        </span>
        <span className={cl.meta}>
          ❤ {post.likes} · 💬 {post.comments}
        </span>
      </span>
    </div>
    {post.image && <img className={cl.postImage} src={storageUrl(`${post.image}.webp`)} alt='' loading='lazy' />}
  </div>
)

const MusicRow = ({ track, queue, query }: { track: Track; queue: Track[]; query: string }) => {
  const currentId = useMusicStore((s) => s.currentId)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const playOne = useMusicStore((s) => s.playOne)
  const active = currentId === track.id
  return (
    <div className={cl.row} onClick={() => playOne(track, queue)}>
      <div className={cl.rowMain}>
        <span className={`${cl.play} ${active ? cl.playActive : ''}`}>{active && isPlaying ? '❚❚' : '▶'}</span>
        <span className={cl.postBody}>
          <span className={cl.name}>
            <Mark text={track.title} query={query} />
          </span>
          <span className={cl.meta}>
            <Mark text={track.artist} query={query} />
            {track.ownerLogin ? ` · ${track.ownerLogin}` : ''}
          </span>
        </span>
      </div>
    </div>
  )
}

const Section = ({
  title,
  total,
  onAll,
  children,
}: {
  title: string
  total: number
  onAll?: () => void
  children: ReactNode
}) => (
  <div className={cl.section}>
    <div className={cl.sectionHead}>
      <span>
        {title} <span className={cl.count}>{total}</span>
      </span>
      {onAll && total > PREVIEW && (
        <button type='button' className={cl.linkButton} onClick={onAll}>
          Показать все
        </button>
      )}
    </div>
    {children}
  </div>
)

/** Тело окна поиска. Монтируется только при открытом окне, поэтому запросы и фокус начинаются с нуля. */
const SearchBody = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const openPost = useOpenPost()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [users, setUsers] = useState<FoundUser[]>([])
  const [posts, setPosts] = useState<FoundPost[]>([])
  const [music, setMusic] = useState<Track[]>([])
  const [totals, setTotals] = useState({ users: 0, posts: 0, music: 0 })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const [searched, setSearched] = useState('')
  const token = useRef(0)

  const text = query.trim()
  const animeFound = text ? ANIME.filter((a) => a.title.toLowerCase().includes(text.toLowerCase())) : []

  const remember = useCallback((value: string) => {
    const v = value.trim()
    if (!v) return
    setRecent((prev) => {
      const next = [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, RECENT_MAX)
      saveRecent(next)
      return next
    })
  }, [])

  /** Результат выбран: запрос запоминается, окно закрывается. */
  const pick = () => {
    remember(text)
    onClose()
  }

  const run = useCallback(async (value: string, kind: Tab, pageNum: number) => {
    const mine = ++token.current
    setLoading(true)
    setError('')
    // Вкладка «Аниме» ищет локально, но счётчики остальных разделов нужны для вкладок
    const serverType = kind === 'anime' ? 'all' : kind
    try {
      const { data } = await client.query({
        query: SEARCH,
        variables: {
          query: value,
          type: serverType,
          limit: kind === 'all' || kind === 'anime' ? PREVIEW : PAGE,
          page: pageNum,
        },
        fetchPolicy: 'network-only',
      })
      // Ответ устаревшего запроса не должен перезаписать свежий
      if (mine !== token.current) return
      const r = data.search
      const foundUsers: FoundUser[] = r.users.map((u) => ({ id: u.id, login: u.login, avatar: u.avatar }))
      const foundPosts: FoundPost[] = r.posts.map((p) => ({
        id: p.id ?? 0,
        description: p.description ?? '',
        userId: p.user?.id ?? 0,
        login: p.user?.login ?? '',
        avatar: p.user?.avatar ?? '',
        image: p.images?.[0]?.small ?? '',
        likes: p.likesCount ?? 0,
        comments: p.commentsCount ?? 0,
      }))
      const foundMusic = r.music.map(toTrack)
      const append = pageNum > 0
      setUsers((prev) =>
        append ? [...prev, ...foundUsers.filter((u) => !prev.some((x) => x.id === u.id))] : foundUsers,
      )
      setPosts((prev) =>
        append ? [...prev, ...foundPosts.filter((p) => !prev.some((x) => x.id === p.id))] : foundPosts,
      )
      setMusic((prev) =>
        append ? [...prev, ...foundMusic.filter((m) => !prev.some((x) => x.id === m.id))] : foundMusic,
      )
      setTotals({ users: r.usersTotal, posts: r.postsTotal, music: r.musicTotal })
      setPage(pageNum)
      setSearched(value)
    } catch (e) {
      if (mine === token.current) setError(e instanceof Error ? e.message : 'Не удалось выполнить поиск')
    } finally {
      if (mine === token.current) setLoading(false)
    }
  }, [])

  // Запрос уходит через 300 мс после последнего нажатия; смена вкладки ищет заново
  useEffect(() => {
    if (!text) {
      token.current++
      setUsers([])
      setPosts([])
      setMusic([])
      setTotals({ users: 0, posts: 0, music: 0 })
      setSearched('')
      setLoading(false)
      return
    }
    const t = setTimeout(() => void run(text, tab, 0), 300)
    return () => clearTimeout(t)
  }, [text, tab, run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = {
    users: tab === 'all' || tab === 'users',
    posts: tab === 'all' || tab === 'posts',
    music: tab === 'all' || tab === 'music',
    anime: tab === 'all' || tab === 'anime',
  }
  const tabTotal = (key: Tab) =>
    key === 'users'
      ? totals.users
      : key === 'posts'
      ? totals.posts
      : key === 'music'
      ? totals.music
      : key === 'anime'
      ? animeFound.length
      : 0
  // На вкладке «Аниме» разделы сервера не показываются, даже если они подгружены для счётчиков
  const showUsers = shown.users && tab !== 'anime'
  const showPosts = shown.posts && tab !== 'anime'
  const showMusic = shown.music && tab !== 'anime'
  const nothing =
    !!text &&
    !loading &&
    searched === text &&
    (!showUsers || users.length === 0) &&
    (!showPosts || posts.length === 0) &&
    (!showMusic || music.length === 0) &&
    (!shown.anime || animeFound.length === 0)
  const loadedForTab =
    tab === 'users' ? users.length : tab === 'posts' ? posts.length : tab === 'music' ? music.length : 0
  const canMore = tab !== 'all' && tab !== 'anime' && !loading && loadedForTab > 0 && loadedForTab < tabTotal(tab)

  return (
    <div className={cl.body}>
      <div className={cl.inputRow}>
        <input
          autoFocus
          className={cl.input}
          type='text'
          placeholder='Поиск людей, постов, музыки, аниме…'
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') remember(text)
          }}
        />
      </div>

      <div className={cl.tabs}>
        {TABS.map((t) => {
          const n = text ? tabTotal(t.key) : 0
          return (
            <button
              key={t.key}
              type='button'
              className={`${cl.tab} ${tab === t.key ? cl.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.title}
              {n > 0 && t.key !== 'all' ? <span className={cl.count}> {n}</span> : null}
            </button>
          )
        })}
      </div>

      <div className={cl.results}>
        {!text && (
          <div className={cl.section}>
            {recent.length > 0 ? (
              <>
                <div className={cl.sectionHead}>
                  <span>Недавние запросы</span>
                  <button
                    type='button'
                    className={cl.linkButton}
                    onClick={() => {
                      setRecent([])
                      saveRecent([])
                    }}
                  >
                    Очистить
                  </button>
                </div>
                {recent.map((r) => (
                  <div key={r} className={cl.row} onClick={() => setQuery(r)}>
                    <span className={cl.rowMain}>
                      <span className={cl.clock}>🕘</span>
                      <span className={cl.name}>{r}</span>
                    </span>
                    <img
                      className={cl.remove}
                      src='/icons/close.svg'
                      alt='Убрать'
                      title='Убрать из истории'
                      onClick={(e) => {
                        e.stopPropagation()
                        setRecent((prev) => {
                          const next = prev.filter((x) => x !== r)
                          saveRecent(next)
                          return next
                        })
                      }}
                    />
                  </div>
                ))}
              </>
            ) : (
              <p className={cl.hint}>Введите имя человека, слово из поста, название трека или аниме</p>
            )}
          </div>
        )}

        {error && <p className={cl.hint}>{error}</p>}
        {text && loading && users.length + posts.length + music.length === 0 && <p className={cl.hint}>Поиск…</p>}
        {nothing && <p className={cl.hint}>Ничего не найдено</p>}

        {text && showUsers && users.length > 0 && (
          <Section title='Люди' total={totals.users} onAll={tab === 'all' ? () => setTab('users') : undefined}>
            {users.map((u) => (
              <UserRow key={u.id} user={u} query={text} onPick={pick} />
            ))}
          </Section>
        )}
        {text && showPosts && posts.length > 0 && (
          <Section title='Посты' total={totals.posts} onAll={tab === 'all' ? () => setTab('posts') : undefined}>
            {posts.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                query={text}
                onPick={(postId) => {
                  pick()
                  // Пост открывается окном поверх текущей страницы
                  openPost(postId)
                }}
              />
            ))}
          </Section>
        )}
        {text && showMusic && music.length > 0 && (
          <Section title='Музыка' total={totals.music} onAll={tab === 'all' ? () => setTab('music') : undefined}>
            {music.map((m) => (
              <MusicRow key={m.id} track={m} queue={music} query={text} />
            ))}
          </Section>
        )}
        {text && shown.anime && animeFound.length > 0 && (
          <Section title='Аниме' total={animeFound.length}>
            {animeFound.map((a) => (
              <div
                key={a.title}
                className={cl.row}
                onClick={() => {
                  pick()
                  navigate('/watch')
                }}
              >
                <div className={cl.rowMain}>
                  <ImageLoading className={cl.animeImage} src={a.preview} />
                  <span className={cl.postBody}>
                    <span className={cl.name}>
                      <Mark text={a.title} query={text} />
                    </span>
                    <span className={cl.meta}>{a.date}</span>
                  </span>
                </div>
              </div>
            ))}
          </Section>
        )}

        {canMore && (
          <button type='button' className={cl.more} onClick={() => void run(text, tab, page + 1)}>
            Показать ещё
          </button>
        )}
        {text && loading && users.length + posts.length + music.length > 0 && <p className={cl.hint}>Загрузка…</p>}
      </div>
    </div>
  )
}

/** Иконка поиска в шапке: открывает окно поиска по людям, постам, музыке и аниме. */
export const Search = () => {
  const [active, setActive] = useState(false)
  const close = useCallback(() => setActive(false), [])
  return (
    <>
      <ImageLoading className={cl.icon} onClick={() => setActive(true)} src={assetUrl('icons/search.svg')} />
      <Modal active={active} setActive={setActive}>
        {active && <SearchBody onClose={close} />}
      </Modal>
    </>
  )
}

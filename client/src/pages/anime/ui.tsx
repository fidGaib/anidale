import { useQuery } from '@apollo/client'
import { PropsWithChildren, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import Content from '@/shared/content'
import { storageUrl } from '@/shared/config'
import { ANIME_CONTINUE_WATCHING, ANIME_HOME } from '@/shared/graphql/schema'
import { AnimeEpisodeFieldsFragment, AnimeReleaseCardFragment, AnimeScheduleFieldsFragment } from '@/shared/graphql/gql/graphql'
import { formatMediaTime } from '@/shared/lib/time'
import { Empty, FormError } from '@/shared/ui/notice'

import cl from './ui.module.css'

const PAGE_NAV = [
  { href: '#new-episodes', label: 'Новые эпизоды' },
  { href: '#schedule', label: 'Расписание' },
  { href: '#videos', label: 'Видео' },
  { href: '#franchises', label: 'Франшизы' },
  { href: '#genres', label: 'Жанры' },
]

type ScheduleDay = 'yesterday' | 'today' | 'tomorrow'

const SCHEDULE_DAYS: Array<{ id: ScheduleDay; label: string }> = [
  { id: 'yesterday', label: 'Вчера' },
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
]

/** Начало суток в местном времени: по нему раскладываем расписание на три дня. */
const startOfDay = (value: Date | number) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Промежуток расписания: вчера, сегодня и завтра целиком. */
const scheduleRange = () => {
  const from = new Date()
  from.setDate(from.getDate() - 1)
  from.setHours(0, 0, 0, 0)
  const to = new Date()
  to.setDate(to.getDate() + 1)
  to.setHours(23, 59, 59, 999)
  return { from: from.getTime(), to: to.getTime() }
}

/** Путь картинки из хранилища: в базе он без расширения, на диске — webp. */
const imageUrl = (path?: string | null) => (path ? storageUrl(`${path}.webp`) : '')

/** Превью серии: кадр, затем превью релиза, затем постер. */
const episodeImage = (episode: AnimeEpisodeFieldsFragment) =>
  imageUrl(episode.preview || episode.release.preview || episode.release.poster)

const releaseMeta = (release: AnimeReleaseCardFragment) =>
  `${release.year} • ${release.season} • ${release.type} • ${release.ageRating}`

const emptyDay = () => ({ yesterday: [], today: [], tomorrow: [] }) as Record<ScheduleDay, AnimeScheduleFieldsFragment[]>

/** Страница каталога аниме: новые эпизоды, расписание, видео, франшизы и жанры. */
export const Anime = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const isAdmin = useRefreshStore((store) => store.refreshData.isAdmin)
  const userId = useRefreshStore((store) => store.refreshData.id)
  const [day, setDay] = useState<ScheduleDay>('today')
  const [range] = useState(scheduleRange)
  const { data, loading, error } = useQuery(ANIME_HOME, {
    variables: { from: range.from, to: range.to },
  })
  // «Продолжить просмотр» есть только у вошедших: гостю запрос не нужен
  const { data: progressData } = useQuery(ANIME_CONTINUE_WATCHING, {
    variables: { limit: 8 },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  })
  const continueWatching = progressData?.animeContinueWatching ?? []

  const home = data?.animeHome
  const schedule = useMemo(() => {
    const groups = emptyDay()
    const today = startOfDay(Date.now())
    for (const entry of home?.schedule ?? []) {
      const diff = Math.round((startOfDay(entry.airAt) - today) / 86_400_000)
      if (diff === -1) groups.yesterday.push(entry)
      else if (diff === 0) groups.today.push(entry)
      else if (diff === 1) groups.tomorrow.push(entry)
    }
    return groups
  }, [home?.schedule])

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <nav className={cl.nav} aria-label='Разделы каталога'>
          <Link to='/anime/catalog' className={cl.navLink}>
            Все аниме
          </Link>
          {PAGE_NAV.map((item, index) => (
            <a key={item.href} href={item.href} className={`${cl.navLink} ${index === 0 ? cl.navLinkActive : ''}`}>
              {item.label}
            </a>
          ))}
          {isAdmin && (
            <Link to='/admin/anime' className={`${cl.navLink} ${cl.navAdmin}`}>
              Управление каталогом
            </Link>
          )}
        </nav>

        {error && <FormError>{error.message}</FormError>}
        {loading && !home && <Empty>Загружаем каталог…</Empty>}

        {home && (
          <>
            {continueWatching.length > 0 && (
              <Section
                id='continue'
                title='Продолжить просмотр'
                subtitle='Серии, на которых вы остановились'
              >
                <div className={cl.episodes}>
                  {continueWatching.map((item) => {
                    const percent =
                      item.duration > 0
                        ? Math.min(100, Math.round((item.position / item.duration) * 100))
                        : 0
                    return (
                      <Link
                        to={`/watch/${item.release.id}?episode=${item.episode.id}`}
                        className={cl.episodeCard}
                        key={item.release.id}
                      >
                        <img
                          src={imageUrl(item.episode.preview || item.release.preview || item.release.poster)}
                          alt={item.release.title}
                          loading='lazy'
                        />
                        <span className={cl.episodeBadge}>Эпизод {item.episode.number}</span>
                        <span className={cl.episodePlay} aria-hidden>
                          <span className={cl.playIcon} />
                        </span>
                        <span className={cl.episodeBody}>
                          <span className={cl.episodeTitle}>{item.release.title}</span>
                          <span className={cl.episodeMeta}>
                            {item.completed
                              ? 'Просмотрено'
                              : `${formatMediaTime(item.position)} из ${formatMediaTime(item.duration)}`}
                          </span>
                        </span>
                        <span className={cl.episodeProgress} aria-hidden>
                          <span style={{ width: `${item.completed ? 100 : percent}%` }} />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </Section>
            )}

            <Section
              id='new-episodes'
              title='Новые эпизоды'
              subtitle='Самые новые и свежие эпизоды в любимой озвучке'
            >
              {home.newEpisodes.length === 0 ? (
                <Empty>Пока нет вышедших эпизодов</Empty>
              ) : (
                <div className={cl.episodes}>
                  {home.newEpisodes.map((episode) => (
                    <Link
                      to={`/watch/${episode.releaseId}?episode=${episode.id}`}
                      className={cl.episodeCard}
                      key={episode.id}
                    >
                      <img src={episodeImage(episode)} alt={episode.release.title} loading='lazy' />
                      <span className={cl.episodeBadge}>Эпизод {episode.number}</span>
                      <span className={cl.episodePlay} aria-hidden>
                        <span className={cl.playIcon} />
                      </span>
                      <span className={cl.episodeBody}>
                        <span className={cl.episodeTitle}>{episode.release.title}</span>
                        <span className={cl.episodeMeta}>{releaseMeta(episode.release)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <div className={cl.promo}>
              <div className={cl.promoText}>
                <h2 className={cl.promoTitle}>Так звучит аниме!</h2>
                <p className={cl.promoSubtitle}>
                  Перевод и озвучивание на русский язык аниме-сериалов и не только. Смотрите новые эпизоды без рекламы
                  и ждите продолжения вместе с нами.
                </p>
              </div>
              <a className={cl.promoButton} href='#schedule'>
                Смотреть расписание
              </a>
            </div>

            <Section
              id='schedule'
              title='Расписание релизов'
              subtitle='Список релизов, над которыми команда трудится прямо сейчас'
            >
              <div className={cl.tabs} role='tablist' aria-label='День показа'>
                {SCHEDULE_DAYS.map((tab) => (
                  <button
                    key={tab.id}
                    type='button'
                    role='tab'
                    aria-selected={day === tab.id}
                    className={`${cl.tab} ${day === tab.id ? cl.tabActive : ''}`}
                    onClick={() => setDay(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={cl.schedule}>
                {schedule[day].length === 0 && <Empty>На этот день ничего не запланировано</Empty>}
                {schedule[day].map((entry) => (
                  <Link to={`/anime/${entry.releaseId}`} className={cl.scheduleCard} key={entry.id}>
                    <img
                      className={cl.schedulePoster}
                      src={imageUrl(entry.release.poster)}
                      alt=''
                      loading='lazy'
                    />
                    <span className={cl.scheduleBody}>
                      <span className={cl.scheduleName}>{entry.release.title}</span>
                      <span className={cl.scheduleEpisode}>
                        Эпизод {entry.episodeNumber} • {new Date(entry.airAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={cl.scheduleMeta}>{releaseMeta(entry.release)}</span>
                      <span className={cl.scheduleGenres}>
                        {entry.release.genres.map((genre) => genre.name).join(' • ')}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Section>

            <Section id='videos' title='Последние видео' subtitle='Самые интересные видео ролики от любимой команды'>
              {home.videos.length === 0 ? (
                <Empty>Пока нет серий с видео</Empty>
              ) : (
                <div className={cl.videos}>
                  {home.videos.map((episode) => (
                    <Link
                      to={`/watch/${episode.releaseId}?episode=${episode.id}`}
                      className={cl.videoCard}
                      key={episode.id}
                    >
                      <span className={cl.videoThumb}>
                        <img src={episodeImage(episode)} alt='' loading='lazy' />
                        <span className={cl.videoPlay} aria-hidden>
                          <span className={cl.playIcon} />
                        </span>
                        {episode.duration && <span className={cl.videoDuration}>{episode.duration}</span>}
                      </span>
                      <span className={cl.videoTitle}>
                        {episode.release.title} — Эпизод {episode.number}
                      </span>
                      <span className={cl.videoMeta}>AniDale</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <Section
              id='franchises'
              title='Франшизы'
              subtitle='Самые интересные и захватывающие франшизы в любимой озвучке'
            >
              {home.franchises.length === 0 ? (
                <Empty>Франшизы появятся, когда у релизов будет общее название</Empty>
              ) : (
                <div className={cl.franchises}>
                  {home.franchises.map((franchise) => (
                    <div className={cl.franchiseCard} key={franchise.name}>
                      <img src={imageUrl(franchise.poster)} alt='' loading='lazy' />
                      <span className={cl.franchiseBody}>
                        <span className={cl.franchiseTitle}>{franchise.name}</span>
                        <span className={cl.franchiseMeta}>
                          {franchise.firstYear === franchise.lastYear
                            ? franchise.firstYear
                            : `${franchise.firstYear} — ${franchise.lastYear}`}{' '}
                          • {franchise.releasesCount} релиза • {franchise.episodesCount} эпизодов
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section id='genres' title='Жанры' subtitle='Список жанров на любой вкус и цвет'>
              {home.genres.length === 0 ? (
                <Empty>Жанры появятся вместе с первыми релизами</Empty>
              ) : (
                <div className={cl.genres}>
                  {home.genres.map((genre) => (
                    <div className={cl.genre} key={genre.id}>
                      <span className={cl.genreName}>{genre.name}</span>
                      <span className={cl.genreCount}>{genre.releasesCount} релизов</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </Content>
  )
}

type SectionProps = PropsWithChildren<{
  id: string
  title: string
  subtitle?: string
}>

const Section = ({ id, title, subtitle, children }: SectionProps) => (
  <section className={cl.section} id={id}>
    <header className={cl.sectionHead}>
      <div>
        <h2 className={cl.sectionTitle}>{title}</h2>
        {subtitle && <p className={cl.sectionSubtitle}>{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
)

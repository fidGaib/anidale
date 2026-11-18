import { useQuery } from '@apollo/client'
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import Content from '@/shared/content'
import { storageUrl } from '@/shared/config'
import { ANIME_CATALOG, ANIME_RELEASE, ANIME_WATCH_PROGRESS } from '@/shared/graphql/schema'
import { AnimeReleaseCardFragment } from '@/shared/graphql/gql/graphql'
import { formatDateTime, formatMediaTime, toTimestamp } from '@/shared/lib/time'
import { Empty, FormError } from '@/shared/ui/notice'

import cl from './ui.module.css'

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Онгоинг',
  completed: 'Завершён',
  announced: 'Анонс',
}

/** Путь постера в хранилище: в базе он без расширения, на диске — webp. */
const imageUrl = (path?: string | null) => (path ? storageUrl(`${path}.webp`) : '')

const cardMeta = (release: AnimeReleaseCardFragment) => `${release.year} • ${release.type} • ${release.ageRating}`

/** Страница релиза: описание, серии и переход к просмотру. Каталог ведёт сюда, а не сразу в плеер. */
export const Release = () => {
  const { id } = useParams()
  const releaseId = Number(id)
  const validRelease = Number.isFinite(releaseId) && releaseId > 0
  const theme = useDarkModeStore((store) => store.theme)
  const userId = useRefreshStore((store) => store.refreshData.id)

  const { data, loading, error } = useQuery(ANIME_RELEASE, {
    variables: { id: releaseId },
    skip: !validRelease,
  })
  const { data: progressData } = useQuery(ANIME_WATCH_PROGRESS, {
    variables: { releaseId },
    skip: !validRelease || !userId,
    fetchPolicy: 'cache-and-network',
  })
  const release = data?.animeRelease
  const progress = progressData?.animeWatchProgress

  // Другие релизы той же франшизы: их ищем тем же каталогом, что и страница «Все аниме»
  const franchise = release?.franchise ?? ''
  const { data: relatedData } = useQuery(ANIME_CATALOG, {
    variables: { filter: { franchise }, limit: 12, sort: 'new' },
    skip: !franchise,
  })
  const related = useMemo(
    () => (relatedData?.animeCatalog.items ?? []).filter((item) => item.id !== releaseId).slice(0, 6),
    [relatedData?.animeCatalog.items, releaseId],
  )

  // Серии приходят от новых к старым; на странице показываем по порядку
  const episodes = useMemo(
    () => [...(release?.episodes ?? [])].sort((a, b) => a.number - b.number),
    [release?.episodes],
  )

  useEffect(() => {
    if (release) document.title = `AniDale - ${release.title}`
  }, [release])

  if (!validRelease) {
    return (
      <Content id={cl.content}>
        <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
          <Empty>Релиз не найден</Empty>
          <Link className={cl.back} to='/anime/catalog'>
            ← Вернуться в каталог
          </Link>
        </div>
      </Content>
    )
  }

  if (loading) {
    return (
      <Content id={cl.content}>
        <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
          <Empty>Загружаем релиз…</Empty>
        </div>
      </Content>
    )
  }

  if (error || !release) {
    return (
      <Content id={cl.content}>
        <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
          {error ? <FormError>{error.message}</FormError> : <Empty>Релиз не найден</Empty>}
          <Link className={cl.back} to='/anime/catalog'>
            ← Вернуться в каталог
          </Link>
        </div>
      </Content>
    )
  }

  const firstEpisode = episodes[0]
  const resumeEpisode = progress && !progress.completed ? progress.episode : undefined
  const startEpisode = resumeEpisode ?? firstEpisode
  const watchHref = startEpisode ? `/watch/${release.id}?episode=${startEpisode.id}` : `/watch/${release.id}`
  const percent =
    progress && progress.duration > 0 ? Math.min(100, Math.round((progress.position / progress.duration) * 100)) : 0

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <Link className={cl.back} to='/anime/catalog'>
          ← Все аниме
        </Link>

        <section className={cl.hero}>
          <div className={cl.posterBox}>
            {release.poster ? (
              <img src={imageUrl(release.poster)} alt={release.title} />
            ) : (
              <span className={cl.noPoster}>{release.title.slice(0, 1)}</span>
            )}
            <span className={cl.status}>{STATUS_LABEL[release.status] ?? release.status}</span>
          </div>

          <div className={cl.info}>
            <h1 className={cl.title}>{release.title}</h1>
            {release.originalTitle && <p className={cl.original}>{release.originalTitle}</p>}

            <div className={cl.meta}>
              <span>{release.year}</span>
              <span>{release.season}</span>
              <span>{release.type}</span>
              <span className={cl.age}>{release.ageRating}</span>
              {release.episodesCount > 0 && <span>{release.episodesCount} серий</span>}
            </div>

            {release.genres.length > 0 && (
              <div className={cl.genres}>
                {release.genres.map((genre) => (
                  <span className={cl.genre} key={genre.id}>
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div className={cl.actions}>
              {episodes.length > 0 ? (
                <Link className={cl.watch} to={watchHref}>
                  <span className={cl.playIcon} aria-hidden />
                  {resumeEpisode ? `Продолжить с эпизода ${resumeEpisode.number}` : 'Смотреть'}
                </Link>
              ) : (
                <span className={cl.watchDisabled}>Серий пока нет</span>
              )}
              {progress && progress.duration > 0 && (
                <div className={cl.progress}>
                  <span className={cl.progressText}>
                    {progress.completed
                      ? 'Просмотрено'
                      : `${formatMediaTime(progress.position)} из ${formatMediaTime(progress.duration)}`}
                  </span>
                  <span className={cl.progressTrack} aria-hidden>
                    <span style={{ width: `${progress.completed ? 100 : percent}%` }} />
                  </span>
                </div>
              )}
            </div>

            {release.description && <p className={cl.description}>{release.description}</p>}

            {release.nextEpisode && (
              <div className={cl.next}>
                <span className={cl.nextLabel}>Следующая серия</span>
                <span>
                  Эпизод {release.nextEpisode.episodeNumber} —{' '}
                  {formatDateTime(toTimestamp(release.nextEpisode.airAt))}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className={cl.section}>
          <header className={cl.sectionHead}>
            <h2 className={cl.sectionTitle}>Серии</h2>
            {release.episodesCount > 0 && (
              <span className={cl.sectionHint}>Всего {release.episodesCount}</span>
            )}
          </header>

          {episodes.length === 0 && <Empty>Серий пока нет — они появятся после выхода эпизодов</Empty>}

          <div className={cl.episodes}>
            {episodes.map((episode) => {
              const active = progress?.episode.id === episode.id
              return (
                <Link
                  key={episode.id}
                  to={`/watch/${release.id}?episode=${episode.id}`}
                  className={`${cl.episode} ${active ? cl.episodeActive : ''}`}
                >
                  <span className={cl.episodeNumber}>{episode.number}</span>
                  <span className={cl.episodeBody}>
                    <span className={cl.episodeTitle}>{episode.title || `Эпизод ${episode.number}`}</span>
                    <span className={cl.episodeMeta}>
                      {formatDateTime(toTimestamp(episode.publishedAt))}
                      {episode.duration ? ` • ${episode.duration}` : ''}
                      {episode.video ? '' : ' • без видео'}
                    </span>
                  </span>
                  <span className={`${cl.episodePlay} ${episode.video ? '' : cl.episodeNoVideo}`}>
                    {episode.video ? 'Смотреть' : 'Нет видео'}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {related.length > 0 && (
          <section className={cl.section}>
            <header className={cl.sectionHead}>
              <h2 className={cl.sectionTitle}>Ещё из франшизы «{release.franchise}»</h2>
            </header>
            <div className={cl.related}>
              {related.map((item) => (
                <Link className={cl.relatedCard} to={`/anime/${item.id}`} key={item.id}>
                  <span className={cl.relatedPoster}>
                    {item.poster ? (
                      <img src={imageUrl(item.poster)} alt={item.title} loading='lazy' />
                    ) : (
                      <span className={cl.noPoster}>{item.title.slice(0, 1)}</span>
                    )}
                  </span>
                  <span className={cl.relatedTitle}>{item.title}</span>
                  <span className={cl.relatedMeta}>{cardMeta(item)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Content>
  )
}

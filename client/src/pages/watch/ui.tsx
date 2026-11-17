import { useQuery } from '@apollo/client'
import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { ViedeoWrapper } from '@/entities/watch'
import { CommentAnime } from '@/features/watch'
import Content from '@/shared/content'
import { storageUrl } from '@/shared/config'
import { ANIME_RELEASE } from '@/shared/graphql/schema'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { Empty, FormError } from '@/shared/ui/notice'

import cl from './ui.module.css'

const imageUrl = (path?: string | null) => (path ? storageUrl(`${path}.webp`) : '')

/** Страница просмотра: плеер выбранной серии и список всех вышедших серий релиза. */
export const Watch = () => {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const releaseId = Number(id)
  const theme = useDarkModeStore((store) => store.theme)

  const { data, loading, error } = useQuery(ANIME_RELEASE, {
    variables: { id: releaseId },
    skip: !Number.isFinite(releaseId) || releaseId <= 0,
  })
  const release = data?.animeRelease

  // Серия выбирается ссылкой (?episode=), по умолчанию — последняя вышедшая
  const requested = Number(params.get('episode'))
  const episode = release?.episodes.find((item) => item.id === requested) ?? release?.episodes[0]

  // Список серий приходит от новых к старым; для переходов «назад/вперёд» нужен порядок показа
  const episodes = useMemo(
    () => [...(release?.episodes ?? [])].sort((a, b) => a.number - b.number),
    [release?.episodes],
  )
  const index = episodes.findIndex((item) => item.id === episode?.id)
  const previous = index > 0 ? episodes[index - 1] : undefined
  const following = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : undefined
  const openEpisode = (target?: typeof episode) => {
    if (target) navigate(`/watch/${releaseId}?episode=${target.id}`)
  }

  useEffect(() => {
    if (!release) return
    document.title = `AniDale - ${release.title}`
  }, [release])

  if (!Number.isFinite(releaseId) || releaseId <= 0) return <NotFoundRelease />
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
          <Link className={cl.back} to='/anime'>
            ← Вернуться в каталог
          </Link>
        </div>
      </Content>
    )
  }

  const title = episode
    ? `${release.title} — Эпизод ${episode.number}${episode.title && episode.title !== `Эпизод ${episode.number}` ? `: ${episode.title}` : ''}`
    : release.title

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <Link className={cl.back} to='/anime'>
          ← Каталог аниме
        </Link>

        {episode ? (
          <>
            <ViedeoWrapper
              key={episode.id}
              title={title}
              src={episode.video ? storageUrl(episode.video) : ''}
              description={episode.description || release.description}
              onEnded={following ? () => openEpisode(following) : undefined}
            />
            <div className={cl.episodeNav}>
              <button
                type='button'
                className={cl.episodeNavButton}
                disabled={!previous}
                onClick={() => openEpisode(previous)}
              >
                ← Предыдущая
              </button>
              <span className={cl.episodeNavInfo}>
                Эпизод {episode.number}
                {episodes.length > 1 ? ` из ${episodes.length}` : ''}
              </span>
              <button
                type='button'
                className={cl.episodeNavButton}
                disabled={!following}
                onClick={() => openEpisode(following)}
              >
                Следующая →
              </button>
            </div>
          </>
        ) : (
          <div className={cl.hero}>
            <img src={imageUrl(release.poster)} alt='' />
            <div>
              <h1 className={cl.heroTitle}>{release.title}</h1>
              <p className={cl.heroText}>{release.description}</p>
              <Empty>Серий пока нет — они появятся после выхода эпизодов</Empty>
            </div>
          </div>
        )}

        <div className={cl.meta}>
          <span>{release.year}</span>
          <span>{release.season}</span>
          <span>{release.type}</span>
          <span className={cl.age}>{release.ageRating}</span>
          {release.genres.map((genre) => (
            <span className={cl.genre} key={genre.id}>
              {genre.name}
            </span>
          ))}
        </div>

        {release.nextEpisode && (
          <div className={cl.next}>
            <span className={cl.nextLabel}>Следующая серия</span>
            <span>
              Эпизод {release.nextEpisode.episodeNumber} — {formatDateTime(toTimestamp(release.nextEpisode.airAt))}
            </span>
          </div>
        )}

        {release.episodes.length > 0 && (
          <section className={cl.section}>
            <h2 className={cl.sectionTitle}>Серии</h2>
            <div className={cl.episodes}>
              {release.episodes.map((item) => (
                <Link
                  key={item.id}
                  to={`/watch/${release.id}?episode=${item.id}`}
                  className={`${cl.episode} ${item.id === episode?.id ? cl.episodeActive : ''}`}
                >
                  <span className={cl.episodeNumber}>{item.number}</span>
                  <span className={cl.episodeBody}>
                    <span className={cl.episodeTitle}>{item.title || `Эпизод ${item.number}`}</span>
                    <span className={cl.episodeMeta}>
                      {formatDateTime(toTimestamp(item.publishedAt))}
                      {item.duration ? ` • ${item.duration}` : ''}
                      {!item.video ? ' • без видео' : ''}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <CommentAnime />
      </div>
    </Content>
  )
}

const NotFoundRelease = () => (
  <Content id={cl.content}>
    <div className={cl.page}>
      <Empty>Релиз не найден</Empty>
      <Link className={cl.back} to='/anime'>
        ← Вернуться в каталог
      </Link>
    </div>
  </Content>
)

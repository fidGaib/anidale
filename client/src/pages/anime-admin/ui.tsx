import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import Content from '@/shared/content'
import { storageUrl } from '@/shared/config'
import {
  ADMIN_ANIME_GENRES,
  ADMIN_ANIME_RELEASES,
  ADMIN_ANIME_SCHEDULE,
  DELETE_ANIME_GENRE,
  DELETE_ANIME_RELEASE,
  DELETE_ANIME_SCHEDULE,
} from '@/shared/graphql/schema'
import { AnimeReleaseCardFragment, AnimeScheduleFieldsFragment } from '@/shared/graphql/gql/graphql'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { Btn } from '@/shared/ui/btn'
import { Empty, FormError } from '@/shared/ui/notice'

import { EpisodesDialog } from './episodes-dialog'
import { ReleaseForm } from './release-form'
import { ScheduleForm } from './schedule-form'
import cl from './ui.module.css'

type Tab = 'releases' | 'schedule' | 'genres'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'releases', label: 'Релизы' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'genres', label: 'Жанры' },
]

const imageUrl = (path?: string | null) => (path ? storageUrl(`${path}.webp`) : '')

const statusLabel = (status: string) =>
  status === 'completed' ? 'Завершён' : status === 'announced' ? 'Анонсирован' : 'Выходит'

/** Админка каталога аниме: релизы, серии, расписание и жанры. */
export const AnimeAdmin = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const isAdmin = useRefreshStore((store) => store.refreshData.isAdmin)
  const [tab, setTab] = useState<Tab>('releases')
  const [search, setSearch] = useState('')
  const [releaseForm, setReleaseForm] = useState<AnimeReleaseCardFragment | 'new' | null>(null)
  const [episodesOf, setEpisodesOf] = useState<AnimeReleaseCardFragment | null>(null)
  const [scheduleForm, setScheduleForm] = useState<{ entry?: AnimeScheduleFieldsFragment; releaseId?: number } | null>(
    null,
  )

  const releases = useQuery(ADMIN_ANIME_RELEASES, {
    variables: { search: search.trim() || null, limit: 100 },
    skip: !isAdmin,
  })
  const schedule = useQuery(ADMIN_ANIME_SCHEDULE, { variables: { limit: 200 }, skip: !isAdmin })
  const genres = useQuery(ADMIN_ANIME_GENRES, { skip: !isAdmin })

  const [deleteRelease] = useMutation(DELETE_ANIME_RELEASE)
  const [deleteSchedule] = useMutation(DELETE_ANIME_SCHEDULE)
  const [deleteGenre] = useMutation(DELETE_ANIME_GENRE)

  if (!isAdmin) {
    return (
      <Content id={cl.content}>
        <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
          <Empty>Раздел доступен только администратору сайта.</Empty>
          <Link className={cl.back} to='/anime'>
            ← Каталог аниме
          </Link>
        </div>
      </Content>
    )
  }

  const releaseList = releases.data?.adminAnimeReleases ?? []
  const scheduleList = schedule.data?.adminAnimeSchedule ?? []
  const genreList = genres.data?.adminAnimeGenres ?? []

  const refreshAll = async () => {
    await Promise.all([releases.refetch(), schedule.refetch(), genres.refetch()])
  }

  const removeRelease = async (release: AnimeReleaseCardFragment) => {
    if (
      !window.confirm(
        `Удалить «${release.title}»? Вместе с релизом удалятся все серии, расписание, постер и видео.`,
      )
    ) {
      return
    }
    await deleteRelease({ variables: { id: release.id } })
    await refreshAll()
  }

  const removeSchedule = async (entry: AnimeScheduleFieldsFragment) => {
    if (!window.confirm(`Убрать из расписания: «${entry.release.title}», серия ${entry.episodeNumber}?`)) return
    await deleteSchedule({ variables: { id: entry.id } })
    await Promise.all([releases.refetch(), schedule.refetch()])
  }

  const removeGenre = async (id: number, name: string) => {
    if (!window.confirm(`Удалить жанр «${name}»?`)) return
    await deleteGenre({ variables: { id } })
    await genres.refetch()
  }

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <Link className={cl.back} to='/anime'>
          ← Каталог аниме
        </Link>

        <header className={cl.head}>
          <div>
            <h1 className={cl.title}>Управление каталогом</h1>
            <p className={cl.subtitle}>Релизы, серии, расписание выхода и жанры. Черновики видны только здесь.</p>
          </div>
          {tab === 'releases' && (
            <Btn variant='primary' onClick={() => setReleaseForm('new')}>
              Добавить релиз
            </Btn>
          )}
          {tab === 'schedule' && (
            <Btn variant='primary' onClick={() => setScheduleForm({})}>
              Запланировать серию
            </Btn>
          )}
        </header>

        <nav className={cl.tabs} aria-label='Разделы админки'>
          {TABS.map((item) => (
            <button
              key={item.id}
              type='button'
              className={`${cl.tab} ${tab === item.id ? cl.tabActive : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === 'releases' && (
          <section className={cl.panel}>
            <input
              className={cl.search}
              placeholder='Поиск по названию'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FormError>{releases.error?.message}</FormError>
            {releases.loading && releaseList.length === 0 && <Empty>Загружаем релизы…</Empty>}
            {!releases.loading && releaseList.length === 0 && <Empty>Релизов пока нет</Empty>}
            <div className={cl.releases}>
              {releaseList.map((release) => (
                <article className={cl.release} key={release.id}>
                  {release.poster ? (
                    <img className={cl.poster} src={imageUrl(release.poster)} alt='' loading='lazy' />
                  ) : (
                    <span className={cl.poster} />
                  )}
                  <div className={cl.releaseBody}>
                    <div className={cl.releaseHead}>
                      <h3 className={cl.releaseTitle}>{release.title}</h3>
                      <span className={`${cl.badge} ${release.isPublished ? cl.published : cl.draft}`}>
                        {release.isPublished ? 'Опубликован' : 'Черновик'}
                      </span>
                    </div>
                    <p className={cl.releaseMeta}>
                      {release.year} • {release.season} • {release.type} • {release.ageRating} •{' '}
                      {statusLabel(release.status)} • {release.episodesCount} серий
                    </p>
                    {release.genres.length > 0 && (
                      <p className={cl.releaseGenres}>{release.genres.map((genre) => genre.name).join(' • ')}</p>
                    )}
                    <div className={cl.releaseActions}>
                      <Btn onClick={() => setEpisodesOf(release)}>Серии</Btn>
                      <Btn onClick={() => setScheduleForm({ releaseId: release.id })}>В расписание</Btn>
                      <Btn onClick={() => setReleaseForm(release)}>Изменить</Btn>
                      <Btn variant='danger' onClick={() => removeRelease(release)}>
                        Удалить
                      </Btn>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'schedule' && (
          <section className={cl.panel}>
            <FormError>{schedule.error?.message}</FormError>
            {schedule.loading && scheduleList.length === 0 && <Empty>Загружаем расписание…</Empty>}
            {!schedule.loading && scheduleList.length === 0 && <Empty>Расписание пустое</Empty>}
            <div className={cl.rows}>
              {scheduleList.map((entry) => (
                <div className={cl.row} key={entry.id}>
                  <span className={cl.rowDate}>{formatDateTime(toTimestamp(entry.airAt))}</span>
                  <span className={cl.rowMain}>
                    <b>{entry.release.title}</b>
                    <small>
                      Эпизод {entry.episodeNumber}
                      {entry.release.isPublished ? '' : ' • релиз в черновике'}
                    </small>
                  </span>
                  <Btn onClick={() => setScheduleForm({ entry })}>Изменить</Btn>
                  <Btn variant='danger' onClick={() => removeSchedule(entry)}>
                    Убрать
                  </Btn>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'genres' && (
          <section className={cl.panel}>
            <FormError>{genres.error?.message}</FormError>
            {genres.loading && genreList.length === 0 && <Empty>Загружаем жанры…</Empty>}
            {!genres.loading && genreList.length === 0 && <Empty>Жанров пока нет</Empty>}
            <div className={cl.rows}>
              {genreList.map((genre) => (
                <div className={cl.row} key={genre.id}>
                  <span className={cl.rowMain}>
                    <b>{genre.name}</b>
                    <small>{genre.releasesCount} релизов</small>
                  </span>
                  <Btn
                    variant='danger'
                    disabled={genre.releasesCount > 0}
                    title={genre.releasesCount > 0 ? 'Жанр используется релизами' : undefined}
                    onClick={() => removeGenre(genre.id, genre.name)}
                  >
                    Удалить
                  </Btn>
                </div>
              ))}
            </div>
            <p className={cl.hint}>Жанр удаляется, только когда его не использует ни один релиз.</p>
          </section>
        )}
      </div>

      {releaseForm && (
        <ReleaseForm
          release={releaseForm === 'new' ? null : releaseForm}
          onClose={() => setReleaseForm(null)}
          onSaved={refreshAll}
        />
      )}
      {episodesOf && (
        <EpisodesDialog
          releaseId={episodesOf.id}
          releaseTitle={episodesOf.title}
          onClose={() => setEpisodesOf(null)}
          onChanged={refreshAll}
        />
      )}
      {scheduleForm && (
        <ScheduleForm
          entry={scheduleForm.entry ?? null}
          releaseId={scheduleForm.releaseId}
          releases={releaseList}
          onClose={() => setScheduleForm(null)}
          onSaved={refreshAll}
        />
      )}
    </Content>
  )
}

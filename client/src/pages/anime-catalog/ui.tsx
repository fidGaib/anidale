import { useQuery } from '@apollo/client'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import Content from '@/shared/content'
import { storageUrl } from '@/shared/config'
import { ANIME_CATALOG, ANIME_FILTERS } from '@/shared/graphql/schema'
import { AnimeReleaseCardFragment } from '@/shared/graphql/gql/graphql'
import { Empty, FormError } from '@/shared/ui/notice'

import cl from './ui.module.css'

const PAGE_SIZE = 24

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Онгоинг',
  completed: 'Завершён',
  announced: 'Анонс',
}

/** Путь постера в хранилище: в базе он без расширения, на диске — webp. */
const imageUrl = (path?: string | null) => (path ? storageUrl(`${path}.webp`) : '')

const releaseMeta = (release: AnimeReleaseCardFragment) =>
  `${release.year} • ${release.type} • ${release.ageRating}`

/** Каталог аниме: поиск по названию, фильтры по жанру, году и типу, сортировка. */
export const AnimeCatalog = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [genreId, setGenreId] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('new')
  const [limit, setLimit] = useState(PAGE_SIZE)

  // Поиск с паузой: запрос уходит, когда пользователь перестал печатать
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  // Смена фильтра начинает список заново
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [query, genreId, year, type, sort])

  const filter = useMemo(
    () => ({
      ...(query ? { search: query } : {}),
      ...(genreId ? { genreId: Number(genreId) } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(type ? { type } : {}),
    }),
    [query, genreId, year, type],
  )

  const { data, loading, error } = useQuery(ANIME_CATALOG, {
    variables: { filter, sort, limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  })
  const { data: filtersData } = useQuery(ANIME_FILTERS)
  const filters = filtersData?.animeFilters
  const page = data?.animeCatalog
  const items = page?.items ?? []
  const hasMore = !!page && items.length < page.total

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <Link className={cl.back} to='/anime'>
          ← Каталог аниме
        </Link>

        <header className={cl.head}>
          <h1 className={cl.title}>Все аниме</h1>
          <p className={cl.subtitle}>Найдите сериал по названию, жанру или году выпуска</p>
        </header>

        <div className={cl.filters}>
          <input
            type='search'
            className={cl.search}
            placeholder='Поиск по названию…'
            aria-label='Поиск по названию'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={cl.select}
            aria-label='Жанр'
            value={genreId}
            onChange={(event) => setGenreId(event.target.value)}
          >
            <option value=''>Все жанры</option>
            {filters?.genres.map((genre) => (
              <option value={genre.id} key={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <select
            className={cl.select}
            aria-label='Год'
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value=''>Все годы</option>
            {filters?.years.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={cl.select}
            aria-label='Тип'
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value=''>Все типы</option>
            {filters?.types.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={cl.select}
            aria-label='Сортировка'
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value='new'>Сначала новые</option>
            <option value='title'>По названию</option>
          </select>
        </div>

        {error && <FormError>{error.message}</FormError>}
        {loading && !page && <Empty>Загружаем каталог…</Empty>}

        {page && (
          <p className={cl.count}>
            {page.total === 0
              ? 'Ничего не найдено'
              : `Найдено: ${page.total} ${page.total === 1 ? 'релиз' : page.total < 5 ? 'релиза' : 'релизов'}`}
          </p>
        )}

        {page && items.length === 0 && !loading && (
          <Empty>Попробуйте изменить запрос или сбросить фильтры</Empty>
        )}

        <div className={cl.grid}>
          {items.map((release) => (
            <Link to={`/anime/${release.id}`} className={cl.card} key={release.id}>
              <span className={cl.poster}>
                {release.poster ? (
                  <img src={imageUrl(release.poster)} alt={release.title} loading='lazy' />
                ) : (
                  <span className={cl.noPoster}>{release.title.slice(0, 1)}</span>
                )}
                {release.latestEpisode && (
                  <span className={cl.badge}>Эпизод {release.latestEpisode.number}</span>
                )}
                <span className={cl.status}>{STATUS_LABEL[release.status] ?? release.status}</span>
              </span>
              <span className={cl.cardTitle}>{release.title}</span>
              <span className={cl.cardMeta}>{releaseMeta(release)}</span>
              <span className={cl.cardGenres}>
                {release.genres.length > 0
                  ? release.genres.slice(0, 3).map((genre) => genre.name).join(' • ')
                  : 'Жанры не указаны'}
                {release.episodesCount > 0 ? ` • ${release.episodesCount} эп.` : ''}
              </span>
            </Link>
          ))}
        </div>

        {hasMore && (
          <button
            type='button'
            className={cl.more}
            disabled={loading}
            onClick={() => setLimit((value) => value + PAGE_SIZE)}
          >
            {loading ? 'Загружаем…' : 'Показать ещё'}
          </button>
        )}
      </div>
    </Content>
  )
}

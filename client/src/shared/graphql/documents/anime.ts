import { graphql } from '../gql/gql'

/** Карточка релиза: то, что нужно странице каталога и списку в админке. */
export const ANIME_RELEASE_CARD = graphql(`
  fragment AnimeReleaseCard on AnimeRelease {
    id
    title
    originalTitle
    description
    year
    season
    type
    ageRating
    status
    poster
    preview
    franchise
    isPublished
    episodesCount
    genres {
      id
      name
    }
    latestEpisode {
      id
      number
      title
      duration
    }
    nextEpisode {
      id
      episodeNumber
      airAt
    }
  }
`)

export const ANIME_EPISODE_FIELDS = graphql(`
  fragment AnimeEpisodeFields on AnimeEpisode {
    id
    releaseId
    number
    title
    description
    video
    preview
    duration
    publishedAt
    release {
      ...AnimeReleaseCard
    }
  }
`)

export const ANIME_SCHEDULE_FIELDS = graphql(`
  fragment AnimeScheduleFields on AnimeScheduleEntry {
    id
    releaseId
    episodeNumber
    airAt
    release {
      ...AnimeReleaseCard
    }
  }
`)

export const ANIME_HOME = graphql(`
  query ANIME_HOME($from: Date!, $to: Date!) {
    animeHome(from: $from, to: $to) {
      newEpisodes {
        ...AnimeEpisodeFields
      }
      videos {
        ...AnimeEpisodeFields
      }
      schedule {
        ...AnimeScheduleFields
      }
      genres {
        id
        name
        releasesCount
      }
      franchises {
        name
        poster
        firstYear
        lastYear
        releasesCount
        episodesCount
      }
    }
  }
`)

export const ANIME_SCHEDULE = graphql(`
  query ANIME_SCHEDULE($from: Date!, $to: Date!) {
    animeSchedule(from: $from, to: $to) {
      ...AnimeScheduleFields
    }
  }
`)

export const ANIME_RELEASE = graphql(`
  query ANIME_RELEASE($id: Int!) {
    animeRelease(id: $id) {
      ...AnimeReleaseCard
      episodes {
        id
        number
        title
        description
        video
        preview
        duration
        publishedAt
      }
      nextEpisode {
        id
        episodeNumber
        airAt
      }
    }
  }
`)

export const ANIME_WATCH_PROGRESS_FIELDS = graphql(`
  fragment AnimeWatchProgressFields on AnimeWatchProgress {
    position
    duration
    completed
    updatedAt
    release {
      ...AnimeReleaseCard
    }
    episode {
      id
      releaseId
      number
      title
      description
      video
      preview
      duration
      publishedAt
    }
  }
`)

/** «Продолжить просмотр»: по одной записи на релиз, самые свежие сверху. */
export const ANIME_CONTINUE_WATCHING = graphql(`
  query ANIME_CONTINUE_WATCHING($limit: Int) {
    animeContinueWatching(limit: $limit) {
      ...AnimeWatchProgressFields
    }
  }
`)

/** Сохранённая позиция в релизе: по ней плеер начинает с места остановки. */
export const ANIME_WATCH_PROGRESS = graphql(`
  query ANIME_WATCH_PROGRESS($releaseId: Int!) {
    animeWatchProgress(releaseId: $releaseId) {
      ...AnimeWatchProgressFields
    }
  }
`)

export const SAVE_ANIME_WATCH_PROGRESS = graphql(`
  mutation SAVE_ANIME_WATCH_PROGRESS($input: AnimeWatchProgressInput!) {
    saveAnimeWatchProgress(input: $input) {
      ...AnimeWatchProgressFields
    }
  }
`)

/** Каталог: поиск, фильтры и сортировка опубликованных релизов. */
export const ANIME_CATALOG = graphql(`
  query ANIME_CATALOG($filter: AnimeReleaseFilter, $sort: String, $limit: Int, $offset: Int) {
    animeCatalog(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      total
      items {
        ...AnimeReleaseCard
      }
    }
  }
`)

export const ANIME_FILTERS = graphql(`
  query ANIME_FILTERS {
    animeFilters {
      years
      types
      genres {
        id
        name
        releasesCount
      }
    }
  }
`)

export const ADMIN_ANIME_RELEASES = graphql(`
  query ADMIN_ANIME_RELEASES($search: String, $limit: Int, $offset: Int) {
    adminAnimeReleases(search: $search, limit: $limit, offset: $offset) {
      ...AnimeReleaseCard
    }
  }
`)

export const ADMIN_ANIME_SCHEDULE = graphql(`
  query ADMIN_ANIME_SCHEDULE($limit: Int) {
    adminAnimeSchedule(limit: $limit) {
      ...AnimeScheduleFields
    }
  }
`)

export const ADMIN_ANIME_GENRES = graphql(`
  query ADMIN_ANIME_GENRES {
    adminAnimeGenres {
      id
      name
      releasesCount
    }
  }
`)

export const ADMIN_ANIME_EPISODES = graphql(`
  query ADMIN_ANIME_EPISODES($releaseId: Int!) {
    adminAnimeEpisodes(releaseId: $releaseId) {
      id
      releaseId
      number
      title
      description
      video
      preview
      duration
      publishedAt
    }
  }
`)

export const SAVE_ANIME_RELEASE = graphql(`
  mutation SAVE_ANIME_RELEASE($input: AnimeReleaseInput!) {
    saveAnimeRelease(input: $input) {
      ...AnimeReleaseCard
    }
  }
`)

export const DELETE_ANIME_RELEASE = graphql(`
  mutation DELETE_ANIME_RELEASE($id: Int!) {
    deleteAnimeRelease(id: $id)
  }
`)

export const SAVE_ANIME_EPISODE = graphql(`
  mutation SAVE_ANIME_EPISODE($input: AnimeEpisodeInput!) {
    saveAnimeEpisode(input: $input) {
      id
      releaseId
      number
      title
      description
      video
      preview
      duration
      publishedAt
    }
  }
`)

export const DELETE_ANIME_EPISODE = graphql(`
  mutation DELETE_ANIME_EPISODE($id: Int!) {
    deleteAnimeEpisode(id: $id)
  }
`)

export const SAVE_ANIME_SCHEDULE = graphql(`
  mutation SAVE_ANIME_SCHEDULE($input: AnimeScheduleInput!) {
    saveAnimeSchedule(input: $input) {
      ...AnimeScheduleFields
    }
  }
`)

export const DELETE_ANIME_SCHEDULE = graphql(`
  mutation DELETE_ANIME_SCHEDULE($id: Int!) {
    deleteAnimeSchedule(id: $id)
  }
`)

export const DELETE_ANIME_GENRE = graphql(`
  mutation DELETE_ANIME_GENRE($id: Int!) {
    deleteAnimeGenre(id: $id)
  }
`)

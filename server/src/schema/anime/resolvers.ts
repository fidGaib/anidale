import { requireAdmin } from '@/api/anime/access'
import AnimeController from '@/api/anime/controller'
import {
  AnimeEpisode,
  AnimeHome,
  AnimeRelease,
  AnimeScheduleEntry,
  Resolvers,
} from '@/schema/resolvers-types'

/**
 * Типы схемы рекурсивны (у релиза есть серии, у серии — релиз), а выборки Prisma собираются
 * под конкретный запрос. Приводим результат сервиса к типам схемы в одном месте, чтобы
 * не расписывать вложенность в каждом резолвере.
 */
const asHome = (value: unknown) => value as AnimeHome
const asRelease = (value: unknown) => value as AnimeRelease
const asReleases = (value: unknown) => value as AnimeRelease[]
const asSchedule = (value: unknown) => value as AnimeScheduleEntry[]
const asScheduleEntry = (value: unknown) => value as AnimeScheduleEntry
const asEpisodes = (value: unknown) => value as AnimeEpisode[]
const asEpisode = (value: unknown) => value as AnimeEpisode

const AnimeResolvers: Resolvers = {
  Query: {
    async animeHome(_, { from, to }) {
      return asHome(await AnimeController.home(from, to))
    },
    async animeSchedule(_, { from, to }) {
      return asSchedule(await AnimeController.schedule(from, to))
    },
    async animeRelease(_, { id }) {
      return asRelease(await AnimeController.release(id))
    },
    async adminAnimeReleases(_, { search, limit, offset }, { req, res }) {
      await requireAdmin(req, res)
      return asReleases(await AnimeController.adminReleases(search, limit, offset))
    },
    async adminAnimeSchedule(_, { limit }, { req, res }) {
      await requireAdmin(req, res)
      return asSchedule(await AnimeController.adminSchedule(limit))
    },
    async adminAnimeGenres(_, __, { req, res }) {
      await requireAdmin(req, res)
      return await AnimeController.adminGenres()
    },
    async adminAnimeEpisodes(_, { releaseId }, { req, res }) {
      await requireAdmin(req, res)
      return asEpisodes(await AnimeController.adminEpisodes(releaseId))
    },
  },
  Mutation: {
    async saveAnimeRelease(_, { input }, { req, res }) {
      await requireAdmin(req, res)
      return asRelease(await AnimeController.saveRelease(input))
    },
    async deleteAnimeRelease(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      return await AnimeController.deleteRelease(id)
    },
    async saveAnimeEpisode(_, { input }, { req, res }) {
      await requireAdmin(req, res)
      return asEpisode(await AnimeController.saveEpisode(input))
    },
    async deleteAnimeEpisode(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      return await AnimeController.deleteEpisode(id)
    },
    async saveAnimeSchedule(_, { input }, { req, res }) {
      await requireAdmin(req, res)
      return asScheduleEntry(await AnimeController.saveSchedule(input))
    },
    async deleteAnimeSchedule(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      return await AnimeController.deleteSchedule(id)
    },
    async deleteAnimeGenre(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      return await AnimeController.deleteGenre(id)
    },
  },
  AnimeRelease: {
    // Карточки каталога приходят без полного списка серий: подставляем пустые значения,
    // чтобы необязательные для конкретного запроса поля не падали.
    genres: (release) => release.genres ?? [],
    episodes: (release) => release.episodes ?? [],
    episodesCount: (release) => release.episodesCount ?? release.episodes?.length ?? 0,
    latestEpisode: (release) => release.latestEpisode ?? release.episodes?.[0] ?? null,
    nextEpisode: (release) => release.nextEpisode ?? null,
  },
  AnimeGenre: {
    releasesCount: (genre) => genre.releasesCount ?? 0,
  },
}

export default AnimeResolvers

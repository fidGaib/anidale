import { requireAdmin } from '@/api/anime/access'
import { animeCached, invalidateAnimeCache } from '@/api/anime/cache'
import AnimeController from '@/api/anime/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import UserController from '@/api/user/controller'
import {
  AnimeEpisode,
  AnimeHome,
  AnimeRelease,
  AnimeScheduleEntry,
  AnimeWatchProgress,
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
const asProgress = (value: unknown) => value as AnimeWatchProgress
const asProgressList = (value: unknown) => value as AnimeWatchProgress[]

const AnimeResolvers: Resolvers = {
  Query: {
    async animeHome(_, { from, to }) {
      const key = `home:${from.getTime()}:${to.getTime()}`
      return asHome(await animeCached(key, () => AnimeController.home(from, to)))
    },
    async animeSchedule(_, { from, to }) {
      const key = `schedule:${from.getTime()}:${to.getTime()}`
      return asSchedule(await animeCached(key, () => AnimeController.schedule(from, to)))
    },
    async animeRelease(_, { id }) {
      return asRelease(await animeCached(`release:${id}`, () => AnimeController.release(id)))
    },
    // Гостю прогресс недоступен: страница просто начнёт серию с начала
    async animeContinueWatching(_, { limit }, { req }) {
      const userId = await getOptionalUserId(req)
      if (!userId) return []
      return asProgressList(await AnimeController.continueWatching(userId, limit))
    },
    async animeWatchProgress(_, { releaseId }, { req }) {
      const userId = await getOptionalUserId(req)
      if (!userId) return null
      return asProgress(await AnimeController.watchProgress(userId, releaseId))
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
      const release = asRelease(await AnimeController.saveRelease(input))
      await invalidateAnimeCache()
      return release
    },
    async deleteAnimeRelease(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      const deleted = await AnimeController.deleteRelease(id)
      await invalidateAnimeCache()
      return deleted
    },
    async saveAnimeEpisode(_, { input }, { req, res }) {
      await requireAdmin(req, res)
      const episode = asEpisode(await AnimeController.saveEpisode(input))
      await invalidateAnimeCache()
      return episode
    },
    async deleteAnimeEpisode(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      const deleted = await AnimeController.deleteEpisode(id)
      await invalidateAnimeCache()
      return deleted
    },
    async saveAnimeSchedule(_, { input }, { req, res }) {
      await requireAdmin(req, res)
      const entry = asScheduleEntry(await AnimeController.saveSchedule(input))
      await invalidateAnimeCache()
      return entry
    },
    async deleteAnimeSchedule(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      const deleted = await AnimeController.deleteSchedule(id)
      await invalidateAnimeCache()
      return deleted
    },
    async saveAnimeWatchProgress(_, { input }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return asProgress(await AnimeController.saveWatchProgress(user.id, input))
    },
    async deleteAnimeGenre(_, { id }, { req, res }) {
      await requireAdmin(req, res)
      const deleted = await AnimeController.deleteGenre(id)
      await invalidateAnimeCache()
      return deleted
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

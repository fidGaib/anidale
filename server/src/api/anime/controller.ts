import AnimeService, { AnimeEpisodeInput, AnimeReleaseInput, AnimeScheduleInput } from './service'

class AnimeController {
  async home(from: Date, to: Date) {
    return await AnimeService.home(from, to)
  }

  async schedule(from: Date, to: Date) {
    return await AnimeService.schedule(from, to)
  }

  async release(id: number) {
    return await AnimeService.release(id)
  }

  async adminReleases(search?: string | null, limit?: number | null, offset?: number | null) {
    return await AnimeService.adminReleases(search, limit, offset)
  }

  async adminSchedule(limit?: number | null) {
    return await AnimeService.adminSchedule(limit)
  }

  async adminGenres() {
    return await AnimeService.adminGenres()
  }

  async adminEpisodes(releaseId: number) {
    return await AnimeService.adminEpisodes(releaseId)
  }

  async saveRelease(input: AnimeReleaseInput) {
    return await AnimeService.saveRelease(input)
  }

  async deleteRelease(id: number) {
    return await AnimeService.deleteRelease(id)
  }

  async saveEpisode(input: AnimeEpisodeInput) {
    return await AnimeService.saveEpisode(input)
  }

  async deleteEpisode(id: number) {
    return await AnimeService.deleteEpisode(id)
  }

  async saveSchedule(input: AnimeScheduleInput) {
    return await AnimeService.saveSchedule(input)
  }

  async deleteSchedule(id: number) {
    return await AnimeService.deleteSchedule(id)
  }

  async deleteGenre(id: number) {
    return await AnimeService.deleteGenre(id)
  }
}

export default new AnimeController()

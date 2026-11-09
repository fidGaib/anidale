import VideoService from './service'

class VideoController {
  async list(id: number, limit?: number | null, offset?: number | null, viewerId?: number) {
    return await VideoService.list(id, limit, offset, viewerId)
  }
  async listAll(limit?: number | null, offset?: number | null, viewerId?: number) {
    return await VideoService.listAll(limit, offset, viewerId)
  }
  async count(id: number, viewerId?: number) {
    return await VideoService.count(id, viewerId)
  }
  async listSaved(userId: number, limit?: number | null, offset?: number | null) {
    return await VideoService.listSaved(userId, limit, offset)
  }
  async create(userId: number, file: File, title?: string | null, communityId?: number | null) {
    return await VideoService.create(userId, file, title, communityId)
  }
  async remove(userId: number, id: number) {
    return await VideoService.remove(userId, id)
  }
  async save(userId: number, id: number, saved: boolean) {
    return await VideoService.save(userId, id, saved)
  }
}

export default new VideoController()

import { Notice } from '../../db/models/notice-model'

class NoticeService {
  async findAll(limit: number, page: number) {
    const notices = await Notice.findMany({
      take: limit,
      skip: page,
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return notices
  }
  async findByUser(id: number, limit: number, page: number) {
    const notices = await Notice.findMany({
      take: limit,
      skip: page,
      where: { userId: id },
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return notices
  }
}
export default new NoticeService()

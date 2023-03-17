import { Notice, NoticeImage } from '@/db/models/notice-model'
import User from '@/db/models/user-model'

import UserDto from '../dtos/user-dto'
import ApiError from '../error/ApiError'
import fileService from './file-service'

class noticeService {
  async create(userId, description, likeness, next) {
    console.log(likeness)
    try {
      let files = []
      if (!likeness && description) {
        //---text
        const notice = await Notice.create({
          data: {
            userId: parseInt(userId),
            description,
          },
        })
        const users = []
        const user = await User.findUnique({ where: { id: notice.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
        return { notice: notice, users }
        //---text
      } else if (likeness.size > 0) files.push(likeness)
      else files.push(...likeness)
      const notice = await Notice.create({
        data: {
          userId,
          description,
        },
      })
      if (files.length > 9) {
        throw ApiError.badRequest('Количество изображений не более 9.')
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validate = await fileService.validate(file, 5, 'image')
        if (validate.error) {
          await Notice.delete({
            where: {
              id: notice.id,
            },
          })
          throw ApiError.badRequest(validate.error)
        }
        const upload = await fileService.upload_one(file, userId, 'notice', true, 800, 450)
        if (upload.error) {
          await Notice.delete({
            where: {
              id: notice.id,
            },
          })
          throw ApiError.badRequest(upload.error)
        }
        const noticeImage = await NoticeImage.create({
          data: {
            oversize: upload.db_min, //был oversize
            minimize: upload.db_min,
            noticeId: notice.id,
            vertical: upload.vertical,
          },
        })
      }
      const find = await Notice.findUnique({
        where: { id: notice.id },
        include: { images: true },
      })
      const users = []
      const user = await User.findUnique({ where: { id: find.userId } })
      const userDto = new UserDto(user)
      users.push(userDto)
      return { notice: find, users }
    } catch (e) {
      return { error: e.message }
    }
  }
  async fetchAll(limit, page) {
    try {
      if (limit < 1) return
      const notices = await Notice.findMany({
        take: parseInt(limit),
        skip: parseInt(page),
        orderBy: { id: 'desc' },
        include: { images: true },
      })
      const count = await Notice.count()
      const users = []
      for (const notice of notices) {
        const user = await User.findUnique({ where: { id: notice.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { notices, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async fetchByUser(id, limit, page) {
    const userId = parseInt(id)
    try {
      if (limit < 1) return
      const notices = await Notice.findMany({
        where: { userId },
        take: parseInt(limit),
        skip: parseInt(page),
        orderBy: { id: 'desc' },
        include: { images: true },
      })
      const count = await Notice.count({ where: { userId } })
      const users = []
      for (const notice of notices) {
        const user = await User.findUnique({ where: { id: notice.userId } })
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { notices, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async remove(notice_id, user_id) {
    try {
      const notice = await Notice.findUnique({
        where: { id: notice_id },
        include: { images: true },
      })
      if (notice) {
        await fileService.removeNoticeImage(notice.images)
      }
      await NoticeImage.deleteMany({
        where: {
          noticeId: notice_id,
        },
      })
      await Notice.delete({ where: { id: notice.id } })
      return true
    } catch (e) {
      console.log(e)
    }
  }
}
export default new noticeService()

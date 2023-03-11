import { Notice, NoticeImage } from '../../db/models/notice-model'
import User from '../../db/models/user-model'
import { today } from '../dtos/date-fetch'
import UserDto from '../dtos/user-dto'
import ApiError from '../error/ApiError'
import fileService from './file-service'

class noticeService {
  async create(user_id, description, likeness, next) {
    try {
      let files = []
      if (!likeness && description) {
        //---text
        const notice = await Notice.create({
          userId: user_id,
          description,
          date: today,
        })
        const users = []
        const user = await User.findByPk(notice.userId)
        const userDto = new UserDto(user)
        users.push(userDto)
        return { notice: notice, users }
        //---text
      } else if (likeness.size > 0) files.push(likeness)
      else files.push(...likeness)
      const notice = await Notice.create({
        userId: user_id,
        description,
        date: today,
      })
      if (files.length > 9) {
        throw ApiError.badRequest('Количество изображений не более 9.')
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validate = await fileService.validate(file, 5, 'image')
        if (validate.error) {
          await notice.destroy()
          throw ApiError.badRequest(validate.error)
        }
        const upload = await fileService.upload_one(file, user_id, 'notice', true, 800, 450)
        if (upload.error) {
          await notice.destroy()
          throw ApiError.badRequest(upload.error)
        }
        const noticeImage = await NoticeImage.create({
          oversize: upload.db_min, //был oversize
          minimize: upload.db_min,
          noticeId: notice.id,
          vertical: upload.vertical,
        })
      }
      const find = await Notice.findOne({
        where: { id: notice.id },
        include: [{ model: NoticeImage }],
      })
      const users = []
      const user = await User.findByPk(find.userId)
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
      const notices = await Notice.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(page),
        order: [['id', 'DESC']],
        include: [{ model: NoticeImage }],
      })
      const count = await Notice.count()
      const users = []
      for (let i = 0; i < notices.rows.length; i++) {
        const notice = notices.rows[i]
        const user = await User.findByPk(notice.userId)
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { notices: notices.rows, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async fetchByUser(id, limit, page) {
    try {
      if (limit < 1) return
      const notices = await Notice.findAndCountAll({
        where: { userId: parseInt(id) },
        limit: parseInt(limit),
        offset: parseInt(page),
        order: [['id', 'DESC']],
        include: [{ model: NoticeImage }],
      })
      const count = await Notice.count({ where: { userId: id } })
      const users = []
      for (let i = 0; i < notices.rows.length; i++) {
        const element = notices.rows[i]
        const user = await User.findByPk(element.userId)
        const userDto = new UserDto(user)
        users.push(userDto)
      }
      return { notices: notices.rows, users, count }
    } catch (e) {
      return { error: e.message }
    }
  }
  async remove(notice_id, user_id) {
    try {
      const notice = await Notice.findOne({
        where: { id: notice_id, userId: user_id },
        include: [{ model: NoticeImage }],
      })
      if (notice?.notice_images?.length) {
        await fileService.removeNoticeImage(notice?.notice_images)
      }
      await NoticeImage.destroy({
        where: {
          noticeId: notice_id,
        },
      })
      await notice.destroy()
      return true
    } catch (e) {
      console.log(e)
    }
  }
}
export default new noticeService()

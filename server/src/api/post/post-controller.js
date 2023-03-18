import { validationResult } from 'express-validator'

import ApiError from '../error/ApiError'
import postService from './post-service'

class postController {
  async create(req, res, next) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка при валидации полей', errors.array()))
      const { user_id, description } = req.body
      let likeness = req.files?.likeness
      if (!user_id) throw next(ApiError.badRequest('Не корректные данные.'))
      if (!likeness && !description) {
        likeness = false
        throw next(ApiError.badRequest('У вас пустая нота.'))
      }
      const postData = await postService.create(parseInt(user_id), description, likeness)
      return res.json(postData)
    } catch (e) {
      console.log(e)
      next(e)
    }
  }
  async update(req, res, next) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка при валидации полей', errors.array()))
    } catch (e) {
      next(e)
    }
  }
  async remove(req, res, next) {
    try {
      const { norice_id, user_id } = req.body
      const post = await postService.remove(norice_id, user_id)
      return res.json(post)
    } catch (e) {
      next(e)
    }
  }
  async fetchAll(req, res, next) {
    try {
      const { limit, page } = req.query
      const posts = await postService.fetchAll(limit, page)
      return res.json(posts)
    } catch (e) {
      next(e)
    }
  }
  async fetchByUser(req, res, next) {
    try {
      const { id, limit, page } = req.query
      const posts = await postService.fetchByUser(id, limit, page)
      return res.json(posts)
    } catch (e) {
      next(e)
    }
  }
}
export default new postController()

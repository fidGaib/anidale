const ApiError = require("../error/ApiError");
const noticeService = require("./notice-service");
const { validationResult } = require("express-validator");
class noticeController {
  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return next(
          ApiError.badRequest("Ошибка при валидации полей", errors.array())
        );
      const { user_id, description } = req.body;
      let likeness = req.files?.likeness;
      if (!user_id) throw next(ApiError.badRequest("Не корректные данные."));
      if (!likeness && !description) {
        likeness = false;
        throw next(ApiError.badRequest("У вас пустая нота."));
      }
      const noticeData = await noticeService.create(
        user_id,
        description,
        likeness
      );
      return res.json(noticeData);
    } catch (e) {
      console.log(e);
      next(e);
    }
  }
  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return next(
          ApiError.badRequest("Ошибка при валидации полей", errors.array())
        );
    } catch (e) {
      next(e);
    }
  }
  async remove(req, res, next) {
    try {
      const { norice_id, user_id } = req.body;
      const notice = await noticeService.remove(norice_id, user_id);
      return res.json(notice);
    } catch (e) {
      next(e);
    }
  }
  async fetchAll(req, res, next) {
    try {
      const { limit, page } = req.query;
      const notices = await noticeService.fetchAll(limit, page);
      return res.json(notices);
    } catch (e) {
      next(e);
    }
  }
  async fetchByUser(req, res, next) {
    try {
      const { id, limit, page } = req.query;
      const notices = await noticeService.fetchByUser(id, limit, page);
      return res.json(notices);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = new noticeController();

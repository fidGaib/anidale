const ApiError = require("../error/ApiError");
const userService = require("./user-service");
const { validationResult } = require("express-validator");

class userController {
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(
          ApiError.BadRequest("Ошибка при валидации полей", errors.array())
        );
      }
      const { email, pass } = req.body;
      const userData = await userService.login(email, pass, next);
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
      return res.json(userData);
    } catch (e) {
      next(e);
    }
  }
  async registration(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(
          ApiError.BadRequest("Ошибка при валидации полей", errors.array())
        );
      }
      const { email, pass } = req.body;
      const userData = await userService.registration(email, pass, next);
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
      return res.json(userData);
    } catch (e) {
      next(e);
    }
  }
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.cookies;
      const userData = await userService.refresh(refreshToken);
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
      return res.json(userData);
    } catch (e) {
      next(e);
    }
  }
  async fetchOne(req, res, next) {
    try {
      const { id } = req.body;
      const user = await userService.fetchOne(id, next);
      return res.json(user.user);
    } catch (e) {
      next(e);
    }
  }
  async fetchAll(req, res, next) {
    try {
      const users = await userService.fetchAll(next);
      return res.json(users);
    } catch (e) {
      next(e);
    }
  }
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.cookies;
      const token = await userService.logout(refreshToken);
      res.clearCookie("refreshToken");
      return res.json(token);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = new userController();

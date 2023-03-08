const Router = require("express");
const noticeController = require("../../api/notice/notice-controller");
const router = new Router();
const { body } = require("express-validator");

router.post(
  "/create",
  body("user_id").trim().isInt(),
  body("description").trim().isString(),
  noticeController.create
);
router.post(
  "/update",
  body("user_id").trim().isInt(),
  body("description").trim().isString(),
  noticeController.update
);
router.post("/remove", noticeController.remove);
router.get("/fetch-all/", noticeController.fetchAll);
router.get("/fetch-chunk/", noticeController.fetchByUser);

module.exports = router;

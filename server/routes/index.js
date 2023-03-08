const Router = require("express");
const router = new Router();
const userRouter = require("./route/user-router");
const noticeRouter = require("./route/notice-router");

router.use("/user", userRouter);
router.use("/notice", noticeRouter);

module.exports = router;

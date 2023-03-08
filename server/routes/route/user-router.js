const Router = require("express");
const userController = require("../../api/user/user-controller");
const router = new Router();
const { body } = require("express-validator");

router.post(
  "/login",
  body("email").trim().isEmail(),
  body("pass").trim().isLength({ min: 6, max: 32 }),
  userController.login
);
router.post(
  "/registration",
  body("email").trim().isEmail(),
  body("pass").trim().isLength({ min: 6, max: 32 }),
  userController.registration
);
router.get("/refresh", userController.refresh);
router.post("/logout", userController.logout);
router.post("/fetch-one-user", userController.fetchOne);
router.get("/fetch-all", userController.fetchAll);

module.exports = router;

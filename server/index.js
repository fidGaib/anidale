require("dotenv").config();
const express = require("express");
const sequelize = require("./db/db");
const NoticeModel = require("./db/models/notice-model");
const UserModel = require("./db/models/user-model");
const TokenModel = require("./db/models/token-model");
const cors = require("cors");
const router = require("./routes");
const ErrorHandlingMiddleware = require("./api/middleware/ErrorHandlingMiddleware");
const PORT = process.env.PORT;
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);
app.use(express.json());
app.use("/api/uploads", express.static(__dirname + "/api/uploads"));
app.use(express.static(__dirname + "/api/uploads"));
app.use(fileUpload({ createParentPath: true }));
app.use(cookieParser());
app.use("/api", router);
app.use(ErrorHandlingMiddleware);
const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.log(e);
  }
};
start();

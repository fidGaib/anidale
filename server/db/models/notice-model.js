const sequelize = require("../db");
const { DataTypes } = require("sequelize");

const Notice = sequelize.define(
  "notice",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    description: { type: DataTypes.STRING },
    date: { type: DataTypes.STRING, allowNull: false },
  },
  { timestamps: false }
);
const NoticeImage = sequelize.define(
  "notice_image",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    minimize: { type: DataTypes.STRING },
    oversize: { type: DataTypes.STRING },
    vertical: { type: DataTypes.BOOLEAN },
  },
  { timestamps: false }
);

Notice.hasMany(NoticeImage);
NoticeImage.belongsTo(Notice);

module.exports = {
  Notice,
  NoticeImage,
};

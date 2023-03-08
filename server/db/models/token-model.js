const { DataTypes } = require("sequelize");
const sequelize = require('../db')


const Token = sequelize.define('token', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user: {type: DataTypes.INTEGER, allowNull: false},
    refreshToken: {type: DataTypes.TEXT, allowNull: false}
}, {timestamps: false})

module.exports = {
    Token
}
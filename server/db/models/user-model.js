import DataTypes from 'sequelize'

import sequelize from '../db'
import { Notice } from './notice-model'

const User = sequelize.define(
  'user',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    pass: { type: DataTypes.STRING, allowNull: false },
    login: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, allowNull: false },
    activationLink: { type: DataTypes.STRING },
    isActivated: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { timestamps: false },
)

User.hasMany(Notice)
Notice.belongsTo(User)

export default User

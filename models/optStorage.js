'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class otpStorage extends Model {
    static associate(models) {
        otpStorage.belongsTo(models.User, {
            foreignKey: "user_id",
            targetKey: "id",
            as: "user",
            onDelete: "CASCADE",
        });
    }
  }
  otpStorage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      opt:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone_number:{
        type: DataTypes.STRING,
        allowNull: true,
      },
      email:{
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "otpStorage",
      underscored: true,
    }
  );
  return otpStorage;
};

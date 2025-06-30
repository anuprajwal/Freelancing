'use strict';
const {
  Model
} = require('sequelize');

//table for chatHistories made with chatBot
module.exports = (sequelize, DataTypes) => {
  class chatHistory extends Model {
    static associate(models) {
      // One User has many Chat Histories
      chatHistory.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  }
  chatHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      chat_status: {
        type: DataTypes.ENUM("pending", "completed"),
        allowNull: false,
        defaultValue: "pending",
      },
      chat_title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      messages: {
        type: DataTypes.JSON,
        allowNull: false,
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
      modelName: "chatHistory",
      underscored: true,
    }
  );
  return chatHistory;
};

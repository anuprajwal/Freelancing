//patients

'use strict';
const {Model} = require('sequelize');

module.exports =  (sequelize, DataTypes) => {
  class generalUser extends Model {
    static associate(models) {
      // One User has Single User Profile
      generalUser.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  }
  generalUser.init(
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
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female", "Others"),
        allowNull: true,
      },
      profile_picture: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:"https://res.cloudinary.com/dwshjkk42/image/upload/v1751270802/profile_11121549_dtesby.png"
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
      modelName: "generalUser",
      underscored: true,
    }
  );
  return generalUser;
};

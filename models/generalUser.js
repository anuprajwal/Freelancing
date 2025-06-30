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
      age: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female", "Others"),
        allowNull: true,
      },
      profile_picture: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5Q9gV4zXwrEtfOJvfv_fugNlYgrnzfKV9_F5CGb_g7IE133yjQVLANrJhKCh1lIgu9tA&usqp=CAU"
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

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class favourateDoctors extends Model {
    static associate(models) {
      // user can have any number of Favourate doctors
      favourateDoctors.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      favourateDoctors.belongsTo(models.User, {
        foreignKey: 'doctor_id',
        as: 'doctor'
      });
    }
  }
  favourateDoctors.init(
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
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "doctor_profiles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      modelName: "favourateDoctors",
      underscored: true,
    }
  );
  return favourateDoctors;
};

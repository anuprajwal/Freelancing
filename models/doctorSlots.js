
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class doctorSlots extends Model {
    static associate(models) {
      doctorSlots.belongsTo(models.User, {
        foreignKey: "doctor_id",
        targetKey: "id",
        as: "doctor",
        onDelete: "CASCADE",
      });
    }
  }

  doctorSlots.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      slots: {
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
      },
    },
    {
      sequelize,
      modelName: "doctorSlots",
      underscored: true,
    }
  );

  return doctorSlots;
};

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class followUp extends Model {
    static associate(models) {
      followUp.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      followUp.belongsTo(models.doctorProfile, {
        foreignKey: 'doctor_id',
        as: 'doctor'
      });
      followUp.belongsTo(models.appointments, {
        foreignKey: 'appointment_id',
        as: 'appointment'
      });
    }
  }
  followUp.init(
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
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "appointments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      followup_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      followup_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      followup_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      followup_status: {
        type: DataTypes.ENUM("pending", "confirmed", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
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
      modelName: "followUp",
      underscored: true,
    }
  );
  return followUp;
};

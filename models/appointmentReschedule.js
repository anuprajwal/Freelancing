'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class appointmentReschedule extends Model {
    static associate(models) {
      // One User has many Appointment Rescheduls
      appointmentReschedule.belongsTo(models.appointments, {
        foreignKey: "appointment_id",
        targetKey: "id",
        as: "appointment",
        onDelete: "CASCADE",
      });

      appointmentReschedule.belongsTo(models.doctorProfile, {
        foreignKey: "doctor_id",
        targetKey: "id",
        as: "doctor",
        onDelete: "CASCADE",
      });
    }
  }
  appointmentReschedule.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      appointment_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      appointment_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      appointment_type: {
        type: DataTypes.ENUM("online_video", "online_audio", "offline"),
        allowNull: false,
        defaultValue: "offline",
      },
      reschedule_status: {
        type: DataTypes.ENUM("requested", "approved", "rejected"),
        allowNull: false,
        defaultValue: "requested",
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: "appointmentReschedule",
      underscored: true,
    }
  );
  return appointmentReschedule;
};

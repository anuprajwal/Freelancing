'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class appointments extends Model {
    static associate(models) {
      // One User has many Appointments
      appointments.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
      appointments.belongsTo(models.doctorProfile, {
        foreignKey: "doctor_id",
        targetKey: "id",
        as: "doctor",
        onDelete: "CASCADE",
      });

      appointments.hasMany(models.payments, {
        foreignKey: "appointment_id",
        as: "payments",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      appointments.hasMany(models.reviewRating, {
        foreignKey: "appointment_id",
        as: "reviewRating",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      appointments.hasMany(models.appointmentReschedule, {
        foreignKey: "appointment_id",
        as: "reschedule",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      appointments.hasMany(models.checkupAppointment, { 
        foreignKey: 'appointmentId',
        as: "checkupAppointment",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      appointments.hasMany(models.followUp, {
        foreignKey: 'appointmentId',
        as: 'followUp',
        onDelete: 'CASCADE',
      });
      
    }
  }
  appointments.init(
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
      appointment_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      appointment_start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      appointment_end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      appointment_status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled", "closed", "unpaid"),
        allowNull: false,
        defaultValue: "pending",
      },
      appointment_type: {
        type: DataTypes.ENUM("online_video", "online_audio", "offline"),
        allowNull: false,
        defaultValue: "offline",
      },
      checkup_time:{
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      payment_mode:{
        type: DataTypes.ENUM("online", "offline"),
        allowNull: false,
        defaultValue: 'online'
      },
      prescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: "appointments",
      underscored: true,
    }
  );
  return appointments;
};

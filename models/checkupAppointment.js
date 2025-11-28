'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class checkupAppointment extends Model {
    static associate(models) {
      // user can have any number of Favourate doctors
      checkupAppointment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      checkupAppointment.belongsTo(models.doctorProfile, {
        foreignKey: 'doctor_id',
        as: 'doctor'
      });
      checkupAppointment.belongsTo(models.appointments, {
        foreignKey: 'appointment_id',
        as: 'appointment'
      });
      checkupAppointment.hasOne(models.payments, {
        foreignKey: "checkup_id",
        as: "payments",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }
  checkupAppointment.init(
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
      },
      checkup_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      checkup_start_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      checkup_end_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      is_payment_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      checkup_status: { 
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
      modelName: "checkupAppointment",
      underscored: true,
    }
  );
  return checkupAppointment;
};

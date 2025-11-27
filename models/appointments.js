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
        as: "patient",
        onDelete: "CASCADE",
      });

      appointments.belongsTo(models.User, {
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

      appointments.hasMany(models.checkupAppointment, { 
        foreignKey: 'appointment_id',
        as: "checkupAppointment",
        sourceKey: "id",
        onDelete: "CASCADE",
      });     

      appointments.hasMany(models.appointmentDocuments, {
        foreignKey: 'appointment_id',
        as: 'appointmentDocuments',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      appointments.belongsTo(models.organisationProfile, {
        foreignKey: "organisation_id",
        targetKey: "id",
        as: "organisation",
        onDelete: "CASCADE",
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
          model: "users",
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
      payment_mode:{
        type: DataTypes.ENUM("cash", "card", "bank_transfer", "mobile_banking"),
        allowNull: false,
        defaultValue: 'mobile_banking'
      },
      prescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      belongs_to_hospital: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "organisation_profiles",
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
      modelName: "appointments",
      underscored: true,
    }
  );
  return appointments;
};

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class appointmentDocuments extends Model {
    static associate(models) {
      // Associations
      appointmentDocuments.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'id',
        as: 'user',
        onDelete: 'CASCADE',
      });

      appointmentDocuments.belongsTo(models.appointments, {
        foreignKey: 'appointment_id',
        targetKey: 'id',
        as: 'appointment',
        onDelete: 'CASCADE',
      });
    }
  }

  appointmentDocuments.init(
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
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'appointments',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      document_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      document_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      document_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'appointmentDocuments',
      underscored: true,
    }
  );

  return appointmentDocuments;
};

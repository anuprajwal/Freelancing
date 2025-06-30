'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class reviewRating extends Model {
    static associate(models) {
      // One appointment has single rating and review
      reviewRating.belongsTo(models.doctorProfile, {
        foreignKey: "doctor_id",
        targetKey: "id",
        as: "doctor",
        onDelete: "CASCADE",
      });

      reviewRating.belongsTo(models.appointments, {
        foreignKey: "appointment_id",
        targetKey: "id",
        as: "appointment",
        onDelete: "CASCADE",
      });
    }
  }
    reviewRating.init(
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
      rating: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 5 },
        allowNull: false,
      },
      review_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: "reviewRating",
      underscored: true,
    }
  );
  return reviewRating;
};

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class doctorRatings extends Model {
    static associate(models) {
      // One Doctor has Simgle Rating
      doctorRatings.belongsTo(models.doctorProfile, {
        foreignKey: "doctor_id",
        targetKey: "id",
        as: "doctor",
        onDelete: "CASCADE",
      });
    }
  }
  doctorRatings.init(
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
        doctor_rating: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
            max: 5,
          },
        },
        doctor_description: {
          type: DataTypes.TEXT,
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
          onUpdate: DataTypes.NOW
        },
    },
    {
      sequelize,
      modelName: "doctorRatings",
      underscored: true,
    }
  );
  return doctorRatings;
};

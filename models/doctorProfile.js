'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class doctorProfile extends Model {
    static associate(models) {
      // One Doctor has Single Doctor Profile
      doctorProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });

      doctorProfile.belongsTo(models.organisationProfile, {
        foreignKey: "organisation_id",
        targetKey: "id",
        as: "organisation",
        onDelete: "CASCADE",
      });

      doctorProfile.hasMany(models.reviewRating, {
        foreignKey: "doctor_id",
        as: "reviewRating",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      doctorProfile.hasOne(models.doctorRatings, {
        foreignKey: "doctor_id",
        as: "doctorRatings",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      doctorProfile.hasMany(models.favourateDoctors, {
        foreignKey: "doctor_id",
        as: "favourateDoctors",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      doctorProfile.hasMany(models.organisationRequest, {
        foreignKey: "doctor_id",
        as: "organisationRequest",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }
  doctorProfile.init(
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
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female", "Others"),
        allowNull: true,
      },
      specialization: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      experience_years: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      consultation_fee: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true
      },
      availability_schedule:{
        type: DataTypes.JSON,
        allowNull: true,
      },
      license_number: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      verified_status: {
        type: DataTypes.BOOLEAN, 
        defaultValue: false,
        allowNull: false,
      },
      profile_picture: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:"https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png"
      },
      appointment_time:{
        type : DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 45
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
      modelName: "doctorProfile",
      underscored: true,
    }
  );
  return doctorProfile;
};

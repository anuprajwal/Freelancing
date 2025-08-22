
'use strict';
const {Model} = require('sequelize');

module.exports =  (sequelize, DataTypes) => {
  class User extends Model {
    // user is the base table for all the other relational tables
    static associate(models) {
      User.hasOne(models.generalUser, {
        foreignKey: "user_id",
        as: "generalUser",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasOne(models.doctorProfile, {
        foreignKey: "user_id",
        as: "doctorProfile",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasOne(models.doctorSlots, {
        foreignKey: "doctor_id",
        as: "doctorSlots",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasOne(models.organisationProfile, {
        foreignKey: "user_id",
        as: "organisationProfile",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.documents, {
        foreignKey: "user_id",
        as: "documents",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.payments, {
        foreignKey: "user_id",
        as: "payments",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.address, {
        foreignKey: "user_id",
        as: "address",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.notificationTokens, {
        foreignKey: "user_id",
        as: "notificationTokens",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.appointments, {
        foreignKey: "user_id",
        as: "appointments",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.chatHistory, {
        foreignKey: "user_id",
        as: "chatHistory",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.reviewRating, {
        foreignKey: "user_id",
        as: "reviewRating",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.favourateDoctors, {
        foreignKey: "user_id",
        as: "favourateDoctors",
        sourceKey: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
        validate: {
          isEmail: true, // Ensures email format is valid
        },
      },
      phone_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
        unique: false,
        validate: {
          is: /^[0-9+\-() ]+$/i, // Allows numbers and basic symbols
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "GOOGLE OAUTH",
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("doctor", "general_user", "hospital_organisation" , "manager"),
        allowNull: false,
      },
      latitude: {
         type: DataTypes.DECIMAL(10, 8),
         allowNull: true
      },
      longitude: {
          type: DataTypes.DECIMAL(11, 8),
          allowNull: true
      },
      is_email_verified:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_phone_verified:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "User",
      timestamps: true, 
      underscored: true,
    }
  );

  return User;
};


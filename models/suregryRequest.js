"use strict";
module.exports = (sequelize, DataTypes) => {
  const surgeryRequest = sequelize.define("surgeryRequest", {
    id: {
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE"
    },

    hospital_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "organisation_profiles", key: "id" },
      onDelete: "CASCADE"
    },

    surgery_name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    date: { 
      type: DataTypes.DATEONLY, 
      allowNull: false 
    },
    time_slot: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },

    patient_name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    patient_age: { type: DataTypes.INTEGER, allowNull: false },
    gender: { type: DataTypes.ENUM("Male", "Female", "Other"), allowNull: false },
    contact_number: { type: DataTypes.STRING(10), allowNull: false },
    medical_history: { type: DataTypes.TEXT, allowNull: true },

    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      defaultValue: "pending"
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    underscored: true,
    tableName: "surgery_requests"
  });

  return surgeryRequest;
};

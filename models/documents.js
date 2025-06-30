'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class documents extends Model {
    static associate(models) {
      // One Doctor or Organisation has many types of Documents
      documents.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  }
  documents.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      document_type: {
        type: DataTypes.ENUM(/* organisation documents */ "registration_certificate", "tax_id", "certificate_of_incorporation", "T_C_Agreement", "blood_bank_license", "drug_license",/* doctor documents */ "medical_license", "degree_certificate",/* pharmacy documents */ "FSSAI_Registration", "NDPS_License"),
        allowNull: false,
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
      document_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      document_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
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
      modelName: "documents",
      underscored: true,
    }
  );
  return documents;
};


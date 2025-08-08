'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class organisationAdmissionRequest extends Model {
    static associate(models) {
        organisationAdmissionRequest.belongsTo(models.User, {
            foreignKey: "user_id",
            targetKey: "id",
            as: "user",
            onDelete: "CASCADE",
        });
        organisationAdmissionRequest.belongsTo(models.organisationProfile, {
            foreignKey: "org_id",
            targetKey: "id",
            as: "organisationProfile",
            onDelete: "CASCADE",
        });
    }
  }
  organisationAdmissionRequest.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      doctor_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      org_id : {
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
            model: "organisation_profile",
            key: "id"
        }
      },
      request_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
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
      modelName: "organisationAdmissionRequest",
      underscored: true,
    }
  );
  return organisationAdmissionRequest;
};

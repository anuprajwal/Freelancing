'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class organisationRequest extends Model {
    static associate(models) {
        organisationRequest.belongsTo(models.User, {
            foreignKey: "doctor_id",
            targetKey: "id",
            as: "user",
            onDelete: "CASCADE",
        });
        organisationRequest.belongsTo(models.organisationProfile, {
            foreignKey: "org_id",
            targetKey: "id",
            as: "organisationProfile",
            onDelete: "CASCADE",
        });
    }
  }
  organisationRequest.init(
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
            model: "organisation_profiles",
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
      modelName: "organisationRequest",
      underscored: true,
    }
  );
  return organisationRequest;
};

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class orgPaymentManagement extends Model {
    static associate(models) {
      // Belongs to User
      orgPaymentManagement.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'id',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }

  orgPaymentManagement.init(
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      specialisation: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      individual: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      overall: {
        type: DataTypes.JSON,
        allowNull: true,
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
        onUpdate: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'orgPaymentManagement',
      tableName: 'org_payment_management',
      underscored: true,
    }
  );

  return orgPaymentManagement;
};
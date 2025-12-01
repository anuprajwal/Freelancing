'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class settlement extends Model {
    static associate(models) {
      settlement.belongsTo(models.doctorProfile, {
        foreignKey: 'doctor_id',
        as: 'doctor',
        onDelete: 'SET NULL',
      });
      settlement.belongsTo(models.transfer, {
        foreignKey: 'transfer_id',
        as: 'transfer',
        onDelete: 'SET NULL',
      });
    }
  }

  settlement.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      transfer_id: { type: DataTypes.STRING, allowNull: true },
      razorpay_transfer_id: { type: DataTypes.STRING, allowNull: true },
      doctor_id: { type: DataTypes.INTEGER, allowNull: true },
      amount: { type: DataTypes.INTEGER, allowNull: false }, // paise
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'INR' },
      status: { type: DataTypes.STRING(50), allowNull: false }, // pending/paid/failed
      settled_at: { type: DataTypes.DATE, allowNull: true },
      extra: { type: DataTypes.JSON, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'settlement',
      tableName: 'settlements',
      underscored: true,
    }
  );

  return settlement;
};

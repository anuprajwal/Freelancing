'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class transfer extends Model {
    static associate(models) {
      transfer.belongsTo(models.doctorProfile, {
        foreignKey: 'doctor_id',
        as: 'doctor',
        onDelete: 'SET NULL',
      });
      transfer.belongsTo(models.payments, {
        foreignKey: 'payment_id',
        as: 'payment',
        onDelete: 'CASCADE',
      });
    }
  }

  transfer.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      razorpay_transfer_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      order_id: { type: DataTypes.STRING, allowNull: true },
      payment_id: { type: DataTypes.STRING, allowNull: true },
      appointment_id: { type: DataTypes.INTEGER, allowNull: true },
      doctor_id: { type: DataTypes.INTEGER, allowNull: true },
      amount: { type: DataTypes.INTEGER, allowNull: false }, // amount in paise
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'INR' },
      status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'created' }, // created / processed / paid / failed
      raw_payload: { type: DataTypes.JSON, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'transfer',
      tableName: 'transfers',
      underscored: true,
    }
  );

  return transfer;
};

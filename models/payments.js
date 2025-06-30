'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class payments extends Model {
    static associate(models) {
      // One appointment or any delevery has each payment and this is yet to be modified on researching over payment gateways
      payments.belongsTo(models.appointments, {
        foreignKey: "appointment_id",
        targetKey: "id",
        as: "appointment",
        onDelete: "CASCADE",
      });

      payments.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  }
  payments.init(
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
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "appointments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "paid", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      payment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "card", "bank_transfer"),
        allowNull: false,
      },
      payment_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: "payments",
      underscored: true,
    }
  );
  return payments;
};

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class address extends Model {
    static associate(models) {
      // One User has many Addresses but one can be active at an instance
      address.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  }
  address.init(
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
      country: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "India",
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      street: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      house_no: {
        type: DataTypes.STRING,
        allowNull : true
      },
      delivery_name:{
        type: DataTypes.STRING,
        allowNull: false
      },
      delivery_pno:{
        type: DataTypes.STRING,
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      modelName: "address",
      underscored: true,
    }
  );
  return address;
};

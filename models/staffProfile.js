'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class staffProfile extends Model {
    static associate(models) {
      // One staff has single profile
      staffProfile.belongsTo(models.staff, {
        foreignKey: "staff_id",
        targetKey: "id",
        as: "staff",
        onDelete: "CASCADE",
      });
    }
  }
  staffProfile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },      
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "staffs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bank_details: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      leave_application: {
        type: DataTypes.JSON,
        allowNull: false,
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
      modelName: "staffProfile",
      underscored: true,
    }
  );
  return staffProfile;
};

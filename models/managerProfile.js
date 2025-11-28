'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class managerProfile extends Model {
    static associate = (models) => {
      managerProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
        onDelete: "CASCADE",
      });
  
      managerProfile.hasMany(models.agentProfile, {
        foreignKey: "manager_id",
        as: "agents",
        onDelete: "CASCADE",
      });
    };
  }
  managerProfile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      verified_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
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
      },
    },
    {
      sequelize,
      modelName: "managerProfile",
      underscored: true,
    }
  );
  return managerProfile;
};

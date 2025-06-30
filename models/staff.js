'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class staff extends Model {
    static associate(models) {
      // each staff has single profile
      staff.hasOne(models.staffProfile, {
        foreignKey: 'staff_id',
        as: 'staff_profile',
        sourceKey: "id",
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });

      staff.hasMany(models.staffSalaries, {
        foreignKey: 'staff_id',
        as: 'staffSalaries',
        sourceKey: "id",
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }
  }
    staff.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      staff_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      staff_email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      staff_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      staff_role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      staff_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      staff_updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "staff",
      underscored: true,
    }
  );
  return staff;
};

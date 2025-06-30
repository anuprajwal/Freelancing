'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class staffSalaries extends Model {
    static associate(models) {
      // the table is not stabelised yet this is also never used.
      // it comes to use on buildin the admin pannel for the whole application
      staffSalaries.belongsTo(models.staff, {
        foreignKey: "staff_id",
        targetKey: "id",
        as: "staff",
        onDelete: "CASCADE",
      });
    }
  }
  staffSalaries.init(
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
      salary_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      salary_status: {
        type: DataTypes.ENUM("pending", "cleared"),
        allowNull: false,
        defaultValue: "pending",
      },
      salary_month: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      salary_year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      salary_type: {
        type: DataTypes.ENUM("monthly", "freelance"),
        allowNull: false,
        defaultValue: "monthly",
      },
      cleared_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_due: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
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
      modelName: "staffSalaries",
      underscored: true,
    }
  );
  return staffSalaries;
};

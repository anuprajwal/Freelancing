'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class packages extends Model {}
  packages.init(
    {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        package_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        package_description: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        package_price : {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: 0,
            },
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
      modelName: "packages",
      underscored: true,
    }
  );
  return packages;
};

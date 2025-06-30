'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class organisationRatings extends Model {
    static associate(models) {
      // One Organisation has Single Rating
      organisationRatings.belongsTo(models.organisationProfile, {
        foreignKey: "organisation_id",
        targetKey: "id",
        as: "organisation",
        onDelete: "CASCADE",
      });
    }
  }
  organisationRatings.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "organisation_profiles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      organisation_rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
      },
    //   organisation_description: {
    //     type: DataTypes.TEXT,
    //     allowNull: false,
    //   },
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
      modelName: "organisationRatings",
      underscored: true,
    }
  );
  return organisationRatings;
};

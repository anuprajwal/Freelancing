'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class organisationProfile extends Model {
    static associate(models) {
      // One User has Single Regestered Organisation
      organisationProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
        onDelete: "CASCADE",
      });

      organisationProfile.hasOne(models.address, {
        foreignKey: "organisation_id",
        as: "address",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      organisationProfile.hasMany(models.doctorProfile, {
        foreignKey: "organisation_id",
        as: "doctorProfile",
        sourceKey: "id",
        onDelete: "CASCADE",
      });

      organisationProfile.hasOne(models.organisationRatings, {
        foreignKey: "organisation_id",
        as: "organisationRatings",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      organisationProfile.hasMany(models.organisationAdmissionRequest, {
        foreignKey: "org_id",
        as: "organisationAdmissionRequest",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }
  organisationProfile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      organisation_type: {
        type: DataTypes.ENUM("hospital", "clinic", "pharmacy", "laboratory"),
        allowNull: false,
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
      organisation_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      regestration_number: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      establishment_year: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      specializations_provided: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ambulance_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      website_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      verified_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"), 
        defaultValue: "pending",
        allowNull: false,
      },
      profile_picture: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:"https://res.cloudinary.com/dwshjkk42/image/upload/v1751270847/hospital-building_4821512_qr0gvo.png"
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
      modelName: "organisationProfile",
      underscored: true,
    }
  );
  return organisationProfile;
};

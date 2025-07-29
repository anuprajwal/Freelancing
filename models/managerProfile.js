module.exports = (sequelize, DataTypes) => {
  const managerProfile = sequelize.define("managerProfile", {
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
    managed_pincode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    verified_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
  }, {
    underscored: true,
    tableName: "manager_profiles",
  });

  managerProfile.associate = (models) => {
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

  return managerProfile;
};

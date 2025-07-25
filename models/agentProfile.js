module.exports = (sequelize, DataTypes) => {
  const agentProfile = sequelize.define("agentProfile", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "manager_profiles",
        key: "id",
      },
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact_number: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    language_spoken: {
      type: DataTypes.JSON, 
      allowNull: false,
    },
    availability_status: {
      type: DataTypes.ENUM("available", "on_task", "unavailable"),
      defaultValue: "available",
    }
  }, {
    underscored: true,
    tableName: "agent_profiles",
  });

  agentProfile.associate = (models) => {
    agentProfile.belongsTo(models.managerProfile, {
      foreignKey: "manager_id",
      as: "manager",
      onDelete: "CASCADE",
    });
  };

  return agentProfile;
};

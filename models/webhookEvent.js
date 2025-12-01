module.exports = (sequelize, DataTypes) => {
    const WebhookEvent = sequelize.define(
        "WebhookEvent",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            event_type: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            payload: {
                type: DataTypes.JSON,
                allowNull: false,
            },

            processed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            tableName: "webhook_events",
            timestamps: true,
            underscored: true,
        }
    );

    return WebhookEvent;
};

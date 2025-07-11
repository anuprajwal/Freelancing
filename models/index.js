const { readdirSync } = require("fs");
const { join } = require("path");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// Database configuration for localhost
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || 'mysql',  
  logging: false, 
});

// callback to ensure db connection
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

async function syncDB() {
  try {
    await db.sequelize.sync({alter:true});
    console.log("Database synced successfully.");
  } catch (error) {
    console.error("Unable to sync the database:", error);
  }
}

connectDB();

const db = {};

readdirSync(__dirname)
  .filter((file) => file !== "index.js" && file.endsWith(".js"))
  .forEach((file) => {
    const modelPath = join(__dirname, file);
    const modelImport = require(modelPath);
    console.log(`[DEBUG] ${file} exports type:`, typeof modelImport);

    if (typeof modelImport === "function") {
      const model = modelImport(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } else {
      console.warn(`[WARNING] Skipped ${file} - not a function export`);
    }
  });


Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Export Sequelize and models
db.sequelize = sequelize;
db.Sequelize = Sequelize;
syncDB();

module.exports = db;

// config/database.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { loggererror, loggerinfo } from "../utils/winston.js";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    connectTimeout:200000,
    ssl: {
      require: false,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 1000,  // Maximum number of connections in the pool
    min: 1,  // Minimum number of connections in the pool
    acquire: 3000,  // Maximum time (in milliseconds) that pool will try to get a connection before throwing an error
    idle: 10000  // Maximum time (in milliseconds) that a connection can be idle before being released
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// This function is only called once to check the connection during server startup.
const connectDatabase = async () => {
  try {
    loggerinfo.info("Attempting to connect to the database...");
    sequelize.authenticate()
      .then(() => {
        loggerinfo.info('Connection successful!!!!!!!!!!!!!!!')
      console.log("Connection successful");
    })
    .catch(err => loggererror.error('Unable to connect to the database:', err));
      loggererror.info( '✓✓✓✓ Database connection established successfully 🎉🎉');
  } catch (error) {
    loggererror.error('Unable to connect to the database:', error);
    throw error;
  }
};

export { sequelize, connectDatabase };

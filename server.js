// server.js
import { app, httpServer } from "./app.js";
import dotenv from "dotenv";
import { sequelize, connectDatabase } from "./config/database.js";
import './models/associations.js'; // Ensure associations are set up
import { loggererror, loggerinfo } from "./utils/winston.js";

dotenv.config(); // Load environment variables

// Track connected sockets for cleanup during shutdown

const startServer = async () => {
  try {
    // Sync the database in non-production environments
    // if (process.env.NODE_ENV !== "production") {
    //   await sequelize.sync({ force: false, alter: false });
    //   loggerinfo.info("Database & tables created!");
    // }
    await sequelize.sync({ force: false, alter: false }).catch((err) => {
      loggererror.error("Sequelize Sync Error:", err);
    });
    

    // Initialize database connection
    await connectDatabase();


    // Set the port dynamically (for Render or similar environments)
    const port = process.env.PORT || 3000;
    const server = httpServer.listen(port, () => {
      loggerinfo.info(`Server is running on port http://localhost:${port}`);
    });

    // Graceful shutdown function
    const shutdown = async () => {
      loggerinfo.info("Received shutdown signal, initiating graceful shutdown...");

  

      // Close the HTTP server
      const serverClosePromise = new Promise((resolve) => {
        server.close(() => {
          loggerinfo.info("HTTP server closed");
          resolve();
        });
      });

      // Close the database connection
      const dbClosePromise = sequelize
        .close()
        .then(() => loggerinfo.info("Database connection closed"))
        .catch((err) => loggererror.error("Error closing database:", err));

      // Wait for all shutdown processes with a timeout
      try {
        await Promise.race([
          Promise.all([serverClosePromise, dbClosePromise]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Shutdown timeout")), 10000)
          ),
        ]);
        loggerinfo.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        loggerinfo.info("Error during shutdown:", error.stack);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    // Handle unhandled rejections and uncaught exceptions
    process.on("unhandledRejection", (reason, promise) => {
      loggererror.error("Unhandled Rejection at:", promise, "reason:", reason);
      shutdown();
    });
    process.on("uncaughtException", (error) => {
      loggererror.error("Uncaught Exception:", error);
      shutdown();
    });
  } catch (error) {
    // loggererror.error("Error starting server:", error);
    console.log("Error starting server:", error.stack);
    process.exit(1);
  }
};

// Start the server
startServer();
export default app;

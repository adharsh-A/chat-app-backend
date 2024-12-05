import winston from "winston";
import moment from "moment-timezone"; // Import moment-timezone

// Reusable function to create a logger
const createLogger = (level) => {
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.colorize(), // Add color to logs
      winston.format.timestamp({
        format: () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"), // Format timestamp in IST
      }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    ),
    transports: [new winston.transports.Console()],
  });
};

// Export loggers for different levels
export const loggerinfo = createLogger("info");
export const loggererror = createLogger("error");
export const loggerwarn = createLogger("warn");
export const loggerdebug = createLogger("debug");

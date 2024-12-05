export const responseTimeLogger = (req, res, next) => {
    const start = process.hrtime(); // Get the start time in high-resolution time
    // Listen for the response to finish
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start); // Calculate elapsed time
      const elapsedTime = seconds + nanoseconds / 1e9; // Convert to seconds
      const currentDate = new Date().toLocaleString(); // Get the current date in ISO format
      console.log(`Response Time: ${elapsedTime.toFixed(3)} seconds for ${req.method} ${req.originalUrl} at ${currentDate}`);
    });
  next();

};
    
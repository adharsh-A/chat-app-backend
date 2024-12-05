import rateLimit from "express-rate-limit";
// Create a rate limiter middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 1000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
export default rateLimiter;

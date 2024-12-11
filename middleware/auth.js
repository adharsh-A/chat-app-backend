import jwt from 'jsonwebtoken';
import HttpError from '../models/http-error.js';
import { User } from '../models/associations.js';
import { loggererror } from '../utils/winston.js';

export const isAuthenticatedUser = async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization?.split(' ')[1];

    // console.log("req.cookies.authToken:", req.cookies.authToken);
    // const token = req.cookies.authToken;
    if (!token) {
      return next(new HttpError('Authentication failed', 401));
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      loggererror.error("Token is not valid");
    }
    const user = await User.findByPk(decodedToken.userId);

    if (!user) {
      throw new HttpError('User not found', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    next(new HttpError('Authentication failed', 401));
    loggererror.error(error);
  }
};
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {

    console.log("req.role:", req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403
        )
      );
    }
    next();
  };
};
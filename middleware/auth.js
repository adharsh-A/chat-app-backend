import jwt from 'jsonwebtoken';
import HttpError from '../models/http-error.js';
import { User } from '../models/associations.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new HttpError('Authentication failed', 401);
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decodedToken.userId);

    if (!user) {
      throw new HttpError('User not found', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    next(new HttpError('Authentication failed', 401));
  }
};
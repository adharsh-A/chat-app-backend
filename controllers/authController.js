import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/associations.js';
import HttpError from '../models/http-error.js';
import { Op } from 'sequelize';
import { loggererror, loggerinfo } from '../utils/winston.js';

// Constants for configuration
const TOKEN_EXPIRATION = '14d';

// Centralized token generation
const generateToken = (userId) => {
  if (!userId) {
    throw new HttpError('User ID is required for token generation', 400);
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });
};

// Signup controller
export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Validate input
    if (!username || !email || !password) {
      return next(new HttpError('All fields are required', 400));
    }

    // Check for existing user
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return next(new HttpError('User already exists', 422));
    }
 const userAvatar= `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`;
    const user = await User.create({
      username,
      email,
      password:password,
      isOnline: true,
      lastSeen: new Date(),
      avatar:userAvatar,
    });
    // Generate authentication token
    const token = generateToken(user.id);
      // Set the token in an HTTP-only cookie
      res.cookie("authToken", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: false,
        sameSite: "None", // Required for cross-origin cookies
        maxAge: 3600000,
      });
      
    res.status(201).json({
      message:"Signup successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
res.status(400).json({message:"Signup failed"});
    loggererror.error('Signup error:', error);
    next(new HttpError('Error during signup', 500));
  }
};

// Login controller
export const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return next(new HttpError('Username and password are required', 400));
    }

    // Find user
    const existingUser = await User.findOne({ where: { username } });
    if (!existingUser) {
      return next(new HttpError('Invalid credentials', 401));
    }
      // Compare the plain password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, existingUser.password);
      if (!isPasswordValid) {
        return next(new HttpError('Invalid password', 401));
      }
  

    // Generate authentication token
    const token = generateToken(existingUser.id);
      // Set the token in an HTTP-only cookie
      
      // Update user online status
      existingUser.isOnline = true;
      existingUser.lastSeen = new Date();
      await existingUser.save();
      
      res.cookie("authToken", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: false,
        sameSite: "None", // Required for cross-origin cookies
        maxAge: 3600000,
      });
      
      
      
    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({message:"Login failed"});
    loggererror.error('Login error:', error);
    next(new HttpError('Server error during login', 500));
  }
};

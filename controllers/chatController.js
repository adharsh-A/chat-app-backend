import { User, Message, Conversation, ConversationParticipant } from '../models/associations.js';
import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../config/database.js';
import { activeUsers } from '../app.js';
import { loggererror, loggerinfo } from '../utils/winston.js';
import HttpError from '../models/http-error.js';
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import { sendEmail } from './utils/email.js'; // Replace with your email utility path

import NodeCache from 'node-cache';

const nodeCache = new NodeCache({ stdTTL:120 }); // Cache for 1 minute
export const getAllUsers = async (req, res) => {

  try {
    const {
      exclude, // User ID to exclude  
      search = '', // Optional search term
      limit = 50 // Optional limit to prevent overwhelming results
    } = req.query;

    // Try to get from cache first
    // const cacheKey = `users:${exclude}:${search}:${limit}`;
    // const cachedUsers = await nodeCache.get(cacheKey);
    
    // if (cachedUsers) {
    //   return res.status(200).json({
    //     users: cachedUsers,
    //     fromCache: true
    //   });
    // }

    // Build query conditions
    const where = {};

    // Exclude current user if specified
    if (exclude) {
      where.id = {
        [Op.ne]: exclude
      };
    }

    // Add search functionality 
    if (search) {
      where[Op.or] = [
        {
          username: {
            [Op.iLike]: `%${search}%`
          }
        },
        {
          email: {
            [Op.iLike]: `%${search}%` 
          }
        }
      ];
    }

    // Fetch users with specified conditions
    const users = await User.findAll({
      where,
      limit: parseInt(limit, 10),
      attributes: ['id', 'username', 'email', 'avatar'], // Select only necessary fields
      order: [['createdAt', 'DESC']], // Optional: sort by most recent
    });
    
    // Map users to ensure consistent response structure
    const mappedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      profilePicture: user.avatar || null
    }));

    // Cache the results for 5 minutes
    await nodeCache.set(cacheKey, mappedUsers, 300);

    res.status(200).json({
      users: mappedUsers,
      fromCache: false
    });
  } catch (error) {
    loggererror.error('Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }

// Create a new conversation
export const createConversation = async (req, res,next) => {
  try {
    const { participantIds } = req.body; // Array of user IDs

    if (participantIds.length < 2) {
      return res.status(400).json({ error: 'A conversation must include at least 2 participants.' });
    }
    const existingConversation = await Conversation.findOne({
      include: [
        {
          model: User,
          as: 'participants',  // Alias for the association
          where: {
            id: {
              [Op.in]: participantIds,  // Ensure the participants are part of the conversation
            }
          },
          required: true,  // Forces the inner join between Conversation and User
          attributes: []   // No need to fetch user attributes for this check
        }
      ],

    });
    
    // Check if the conversation exists
    if (existingConversation) {
      const io = req.app.get('io');
      io.emit("notification", { message: "conversation already exists", type: "error" });
      return next(new HttpError('Conversation already exists', 400));
    }
    
    
    // Create the conversation
    const conversation = await Conversation.create();

    // Add participants
    const participants = participantIds.map((userId) => ({
      conversationId: conversation.id,
      userId,
    }));
    await ConversationParticipant.bulkCreate(participants);
    const conversationData = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username','avatar'], // Include only necessary fields
        },
      ],
    })

    res.status(201).json({ conversation: conversationData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to create conversation.', details: error.message });
  }
};

// Send a message in a conversation
export const sendMessage = async (req, res) => {
  try {
    const { senderId, conversationId, content } = req.body;

    // Validate conversation and sender
    const conversation = await Conversation.findByPk(conversationId);
    conversation.lastMessageTime = new Date();
    conversation.lastMessage= content
    conversation.save();
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const sender = await User.findByPk(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found.' });
    }

    // Create message
    const message = await Message.create({ senderId, conversationId, content });

    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }]
    });
    const participants = await Conversation.findByPk(conversationId, {
      include: [{ model: User, as: 'participants', attributes: ['id','username'] }]
    });
    participants.participants.forEach(participant => {
      if (participant.id === senderId) return;     
    
      const recipientSocketId = activeUsers.get(participant.id);
      
      if (recipientSocketId) {
        const io = req.app.get('io');
        io.to(recipientSocketId).emit('newMessage', fullMessage);
        io.to(recipientSocketId).emit('notification', {message: "You have a new message by "+sender.username,type: "success"});
      }
    })
    
    // const io = req.app.get('io');
    // io.to(conversationId).emit('message', fullMessage);

    res.status(201).json({ message });
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({ error: 'Failed to send message.', details: error.message });
  }
};

// Get all messages in a conversation
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username','isOnline','lastSeen'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({ messages });
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({ error: 'Failed to fetch messages.', details: error.message });
  }
};

// Get conversations of a user
export const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: 'participants',
          where: { id: userId }, // Exclude the current user
          attributes: ['id', 'username','avatar'],
          through: {
            attributes: [],
          },
        },
        {
          model: Message,
          as: 'messages',
          attributes: ['content', 'createdAt'],
          limit: 1, // Limiting to the latest message
          order: [['createdAt', 'DESC']], // Ensure messages are sorted in descending order
        },
      ],
      order: [['lastMessageTime', 'DESC']], // Sort conversations by lastMessageTime
    });
    //for receivers username
    for (const conversation of conversations) {
      const participants = await conversation.getParticipants({ where: { id: { [Op.ne]: userId } } });
      conversation.dataValues.receivers = participants.map((participant) => ({
        id: participant.id,
        username: participant.username,
        avatar: participant.avatar,
      }));
    }


    
    // Send the response
    res.status(200).json({ conversations });
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({
      error: 'Failed to fetch conversations.',
      details: error,
    });
  }
};


// Add a user to an existing conversation
export const addUserToConversation = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    await ConversationParticipant.create({ conversationId, userId });

    res.status(201).json({ message: 'User added to the conversation.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add user to the conversation.', details: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId
    );
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    await conversation.destroy();
    res.status(200).json({ message: 'Conversation deleted successfully.' })
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({ error: 'Failed to delete conversation.', details: error.message });
  }
    
}
export const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['username','email','avatar'],
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({ error: 'Failed to fetch user.', details: error.message });
  }
};
export const putSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, avatar } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.username = username;
    user.email = email;
    user.avatar = avatar;
    await user.save();
    const io = req.app.get('io');
    io.emit("notification", {message: "Your profile has been updated", type: "success"});
    res.status(200).json({ user });
  } catch (error) {
    loggererror.error(error);
    res.status(500).json({ error: 'Failed to update user.', details: error.message });
  }
};
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate a reset token valid for 1 hour
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create the password reset link
    const resetLink = process.env.NODE_ENV === 'production' ? `http://chat-app-frontend1.vercel.app/reset-password/${token}` : `http://localhost:5173/reset-password/${token}`;

    // Send the reset link via email
    await sendEmail(user.email, 'Password Reset Request',resetLink);

    // Respond with success message
    res.status(200).json({ message: 'Password reset link sent successfully, check your email✅.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process the request.', details: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user associated with the token
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired token.' });
    }

    // Hash the new password

    // Update the user's password
    user.password = newPassword;
    await user.save();

    // Respond with success message
    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password.', details: error.message });
  }
};
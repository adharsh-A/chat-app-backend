import { User, Message, Conversation, ConversationParticipant } from '../models/associations.js';
import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../config/database.js';
import { activeUsers } from '../app.js';
import { loggererror, loggerinfo } from '../utils/winston.js';
import HttpError from '../models/http-error.js';

export const getAllUsers = async (req, res) => {

  try {
    const {
      exclude, // User ID to exclude
      search = '', // Optional search term
      limit = 50 // Optional limit to prevent overwhelming results
    } = req.query;

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

    res.status(200).json({
      users: mappedUsers
    });
  } catch (error) {
    loggererror.error('Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
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
      where: {
        // This condition checks that the conversation has exactly the same participants
        id: {
          [Op.in]: participantIds,
        }
      }
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
        { model: User, as: 'sender', attributes: ['id', 'username'] },
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
    // const sortedConversations = conversations.sort((a, b) => {
    //   const dateA = new Date(a.messages.createdAt);
    //   const dateB = new Date(b.messages.createdAt);
    //   return dateA - dateB; // Ascending order: earliest to latest
    // });
    
    
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

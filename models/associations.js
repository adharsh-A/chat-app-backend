// models/associations.js
import User from './User.js';
import Message from './Message.js';
import Conversation from './Conversation.js';
import ConversationParticipant from './ConversationParticipant.js';

// User associations
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.belongsToMany(Conversation, { 
  through: ConversationParticipant,
  foreignKey: 'userId',
  as: 'conversations'
});

// Message associations
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Conversation associations
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Conversation.belongsToMany(User, {
  through: ConversationParticipant,
  foreignKey: 'conversationId',
  as: 'participants'
});


// Export all models
export { User, Message, Conversation, ConversationParticipant };
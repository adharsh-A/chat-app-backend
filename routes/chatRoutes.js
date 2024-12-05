import express from 'express';
import {
  createConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  addUserToConversation,
  getAllUsers
} from '../controllers/chatController.js';

const router = express.Router();

router.post('/conversations', createConversation);
router.post('/messages', sendMessage);
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.get('/users/:userId/conversations', getUserConversations);
router.post('/conversations/add-user', addUserToConversation);
router.get('/users', getAllUsers);

export default router;

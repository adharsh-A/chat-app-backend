import express from 'express';
import {
  createConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  addUserToConversation,
  getAllUsers,
  deleteConversation,
  getSingleUser,putSingleUser
} from '../controllers/chatController.js';
import { isAuthenticatedUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/conversations', createConversation);
router.post('/messages', sendMessage);
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.get('/users/:userId/conversations', getUserConversations);
router.post('/conversations/add-user', addUserToConversation);
router.get('/users', getAllUsers);
router.delete("/conversations/:conversationId", deleteConversation);
router.get("/users/:userId", getSingleUser);
router.put("/users/:userId", putSingleUser);

export default router;

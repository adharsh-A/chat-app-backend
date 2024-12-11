import express from 'express';
import {
  createConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  addUserToConversation,
  getAllUsers,
  deleteConversation,
  getSingleUser, putSingleUser,
  forgetPassword,
  resetPassword
} from '../controllers/chatController.js';
import { isAuthenticatedUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/conversations',isAuthenticatedUser, createConversation);
router.post('/messages',isAuthenticatedUser, sendMessage);
router.get('/conversations/:conversationId/messages',isAuthenticatedUser, getConversationMessages);
router.get('/users/:userId/conversations',isAuthenticatedUser, getUserConversations);
router.post('/conversations/add-user',isAuthenticatedUser, addUserToConversation);
router.get('/users', getAllUsers);
router.delete("/conversations/:conversationId",isAuthenticatedUser, deleteConversation);
router.get("/users/:userId",isAuthenticatedUser, getSingleUser);
router.put("/users/:userId",isAuthenticatedUser, putSingleUser);
router.post("/forget-password", forgetPassword)
router.post("/reset-password/:token", resetPassword);

export default router;

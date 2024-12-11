// app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { responseTimeLogger } from './middleware/responseTimeLogger.js';
import rateLimiter from './middleware/rate-limiter.js';
import HttpError from './models/http-error.js';
import { loggerinfo, loggererror, loggerwarn, loggerdebug } from "./utils/winston.js";

//routes
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import ConversationParticipant from "./models/ConversationParticipant.js";
import User from "./models/User.js";
import cookieParser from "cookie-parser";

dotenv.config(); // Load environment variables

const app = express();
const httpServer = createServer(app); // Create an HTTP server with express

// Middleware setup


// Set up Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'https://chat-app-frontend1.vercel.app/'], // Adjust this for production if needed
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  },
  pingTimeout: 60000, // Close connection if client doesn't respond for 60 seconds
});


const activeUsers = new Map();

// Socket.IO connection event handling
io.on("connection", (socket) => {
  // console.log(socket);
  const token = socket.handshake.auth.token; // Retrieve token
  const userId = socket.handshake.query.id; // Retrieve userId


  // Verify token (you might want to add your own token verification logic here)
  if (!token) {
    socket.disconnect(); // Disconnect if no token is present
    loggerwarn.warn("User disconnected due to missing token");
    return;
  }
  
  // User authentication and connection
  socket.on('authenticate', async (userId) => {
    // Store user's socket connection
    activeUsers.set(userId, socket.id);
    socket.userId = userId;
    const currentUser = await User.findByPk(userId);
        currentUser.isOnline = true;
        // Notify user's connections
        socket.broadcast.emit('userOnline', userId);
      });

  loggerinfo.info(`User connected socketId: ${socket.id} with userId: ${userId}`);


  


   // Handle typing indicator
   socket.on('typing', (typingData) => {
    // Broadcast typing status to other participants
    socket.broadcast.to(typingData.conversationId).emit('userTyping', {
      userId: typingData.userId,
      isTyping: typingData.isTyping
    });
  });




  // Handle conversation creation
  socket.on('createConversation', async (conversationData) => {
    try {
      const conversation = await Conversation.create();
      
      // Add participants
      const participants = conversationData.participantIds.map((userId) => ({
        conversationId: conversation.id,
        userId,
      }));
      await ConversationParticipant.bulkCreate(participants);

      // Notify participants
      conversationData.participantIds.forEach(participantId => {
        const recipientSocketId = activeUsers.get(participantId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('newConversation', conversation);
        }
      });
    } catch (error) {
      socket.emit('conversationError', { error: error.message });
    }
  });



    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        activeUsers.delete(socket.userId);
        socket.broadcast.emit('userOffline', socket.userId);
      }
      const currentUser = User.findByPk(userId);
      currentUser.isOnline = false;
      loggererror.error('Client disconnected:', userId);
    });
  
  socket.on("error", (error) => {
      io.emit("notification", {message: "You are now offline❌", description: "You are now offline!", type: "error"});
      loggererror.error(`Socket error: ${error}`);
    });
  
  });
  

// Make the Socket.IO instance accessible via the app
app.set('io', io);

// General middleware setup

// CORS setup
const corsOptions = {
  origin: `process.env.CLIENT_URL`, // Adjust for production
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// app.set('trust proxy', 1);
app.disable("x-powered-by");

//middleware
app.use(helmet()); // Security middleware
app.use(rateLimiter); // Rate limiting middleware
// app.use(responseTimeLogger); // Response time logging middleware

// Serve static files from the public directory
app.use(express.static("public"));

// API routes
app.use(cookieParser());//for parsing cookies in req.cookies
app.get("/test", (req, res) => {
  res.send("Test endpoint is working");
});

  //send html file
  app.get("/", (req, res) => {
  // Send HTML file from public directory
    res.sendFile('index.html', { root: './public' });
  });

    //routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);


// Error handling for 404
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  return next(error);
});

// General error handling middleware -httperror
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);

  res.json({ message: error.message || "An unknown error occurred!" });
});

// Export both app and httpServer for server and Socket.IO usage
export { app, httpServer,activeUsers };

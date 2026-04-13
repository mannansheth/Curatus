const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { createServer } = require('http');
const { Server } = require('socket.io');

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user") 
const journalRoutes = require("./routes/journal");
const communityRoutes = require("./routes/community");
const appointmentRoutes = require("./routes/appointment");
const therapistRoutes = require("./routes/therapist");
const chatbotRoutes = require("./routes/chatbot")
const authenticateToken = require("./middleware/authenticateToken")
const updateMessageStatus = require("./services/UpdateMessageStatus")

const app = express();
const httpServer = createServer(app); 
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // your frontend
    credentials: true
  }
});
io.on('connection', (socket) => {

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User joined personal room: user_${userId}`);
  });

  socket.on('join_chat', ({ aptId, userId }) => {
    socket.join(`apt_${aptId}`);  
    socket.emit("user_joined", userId);

    console.log(`User ${userId} joined room: apt_${aptId}`);
  });

  socket.on("mark_read", async ({ aptId, userId }) => {
    await updateMessageStatus(aptId, userId);

    io.to(`apt_${aptId}`).emit("messages_read", {
      aptId,
      readBy: userId
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", authenticateToken, userRoutes)
app.use("/api/journal", authenticateToken, journalRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/appointments", authenticateToken, appointmentRoutes);
app.use("/api/chatbot", authenticateToken, chatbotRoutes);
app.use("/api/therapist", therapistRoutes);
httpServer.listen(5000, () => {
  console.log("Service started");
  
})
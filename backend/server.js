const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "your_secret_key_here";

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const journalRoutes = require("./routes/journal");
const communityRoutes = require("./routes/community");
const appointmentRoutes = require("./routes/appointment");
const therapistRoutes = require("./routes/therapist");
const authenticateToken = require("./middleware/authenticateToken")

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", authenticateToken, userRoutes)
app.use("/api/journal", authenticateToken, journalRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/appointments", authenticateToken, appointmentRoutes);
app.use("/api/therapist", therapistRoutes);
app.listen(5000, () => {
  console.log("Service started");
  
})
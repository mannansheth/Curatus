const express = require("express");
const db = require("../config/dbConfig");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const {JWT_SECRET} = process.env;
const router = express.Router();

router.post("/message", async (req, res) => {
  try {
    let userID = null;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userID = decoded.id;
      } catch (err) {
        // console.log(err);
        // return res.sendStatus(403);
      }
    }
    const { message } = req.body;


    
    if (!message || !message.content) {
      return res.status(400).json({ message: "Message content required" });
    }


    const now = new Date();

    if (message.name === "Anonymous" || !userID) {
      const ip = req.ip;

      const [rows] = await db.query(
        "SELECT createdAt FROM messages WHERE userID IS NULL AND ipAddress = ? ORDER BY createdAt DESC LIMIT 1",
        [ip]
      );

      if (rows.length > 0) {
        const lastMessageTime = new Date(rows[0].createdAt);
        const diffMs = now - lastMessageTime;

        if (diffMs < 60 * 60 * 1000) {
          return res.status(200).json({
            success:false,
            message: "Anonymous users can send only 1 message per hour"
          });
        }
      }

      await db.query(
        "INSERT INTO messages (content, userID, ipAddress, createdAt) VALUES (?, NULL, ?, ?)",
        [message.content, ip, now]
      );

    } 
    else {
      

      const [rows] = await db.query(
        "SELECT createdAt FROM messages WHERE userID = ? ORDER BY createdAt DESC LIMIT 1",
        [userID]
      );

      if (rows.length > 0) {
        const lastMessageTime = new Date(rows[0].createdAt);
        const diffMs = now - lastMessageTime;

        if (diffMs < 10 * 60 * 1000) {
          return res.status(200).json({
            success:false,
            message: "You can send only 1 message every 10 minutes"
          });
        }
      }

      await db.query(
        "INSERT INTO messages (content, userID, ipAddress, createdAt) VALUES (?, ?, NULL, ?)",
        [message.content, userID, now]
      );
    }

    return res.json({ success: true });


  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/messages", async (req, res) => {
  let userID = null;

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(decoded);
      userID = decoded.id;
    } catch (err) {
      // console.log(err)
      console.log("error")
      // return res.sendStatus(403);
    }
  }

  const ip = req.ip;
  const [messages] = await db.query(`SELECT m.ID, m.content, m.createdAt, u.Name, m.ipAddress, m.userID 
    FROM messages m  LEFT JOIN users u ON u.ID = m.userID
    WHERE m.createdAt >= NOW() - INTERVAL 1 HOUR;
     `)
    messages.forEach(m => m["isOwn"] = (userID === m.userID) || (req.ip === m.ipAddress) && !userID)

    return res.json({messages})
})

module.exports = router;

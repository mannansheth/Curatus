const express = require("express");
const db = require("../config/dbConfig");
const getChatbotResponse = require("../services/chatbot");
const router = express.Router();

router.post("/message", async (req, res) => {
  console.log("received");
  const {message} = req.body;
  const time = new Date();
  const userId = req.userId;
  const [dbcontext] = await db.query("SELECT summary FROM userContext WHERE userID = ? ORDER BY createdAt DESC LIMIT 1;", [userId]);
  var userContext = null;
  if (dbcontext.length > 0) {
    userContext = dbcontext[0].summary;
  }
  try {
    const {chatbotResponse, newUserContext, threatLevel} = await getChatbotResponse(userContext, message.text);
    const response = await getChatbotResponse(userContext, message.text);

    db.query("INSERT INTO chatbotMessages(userID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, ?)", [userId, message.text, "user", threatLevel, time])

    db.query("INSERT INTO chatbotMessages(userID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, NOW())", [userId, message.text, "bot", ""])

    db.query("INSERT INTO userContext (userID, summary, createdAt) VALUES (?, ?, NOW())", [userId, newUserContext]);
    return res.json({botReply: {sender: "bot", text:chatbotResponse, timestamp:time}})

  } catch (err) {
    console.error(err);
    res.status(500).json({message:"Internal error"})
  }


})

module.exports = router;
const express = require("express");
const db = require("../config/dbConfig");
const getChatbotResponse = require("../services/chatbot");
const isMessageInvalid = require("../middleware/filterMessage")
const router = express.Router();

router.post("/message", async (req, res) => {

  const {message} = req.body;
  if (isMessageInvalid(message.text)) {
      return res.status(200).json({success:false, message: "Please keep the conversation family friendly."})
    }
  const time = new Date();
  const userId = req.userId;
  // if (message.text === "/clrn") {
  //   await db.query("UPDATE userContext SET isUsable = 0 WHERE userID = ?", [userId]);
  //   return res.json({
  //     success:true
  //   })
  // }

  const [dbcontext] = await db.query("SELECT summary FROM userContext WHERE userID = ? ORDER BY createdAt DESC LIMIT 1;", [userId]);
  var userContext = null;
  if (dbcontext.length > 0) {
    userContext = dbcontext[0].summary;
  }
  try {

    const response = await getChatbotResponse(userContext, message.text);

    db.query("INSERT INTO chatbotMessages(userID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, ?)", [userId, message.text, "user", response.threatLevel || response.threat_level, time])

    db.query("INSERT INTO chatbotMessages(userID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, NOW())", [userId, response.chatbotResponse, "bot", ""])

    db.query("INSERT INTO userContext (userID, summary, createdAt) VALUES (?, ?, NOW())", [userId, response.newUserContext]);
    return res.json({botReply: {sender: "bot", text:response.chatbotResponse, timestamp:time}, success:true})

  } catch (err) {
    console.error(err);
    res.status(500).json({message:"Internal error"})
  }


})

router.get("/messages", async (req, res) => {
  const userId = req.userId;
  const [messages] = await db.query("SELECT sender, message AS text, sentAt AS timestamp FROM chatbotMessages WHERE userID = ?", [userId]);
  return res.json({messages});
})

module.exports = router;
const express = require("express");
const db = require("../config/dbConfig");
const getChatbotResponse = require("../services/chatbot");
const isMessageInvalid = require("../middleware/filterMessage")
const router = express.Router();

const createNewChat = async (userId) =>  {
  const [result] = await db.query("INSERT INTO chatbotChats (userID) VALUES (?)", [userId]);
  return result.insertId;
}

router.post("/message", async (req, res) => {

  const {message} = req.body;
  if (isMessageInvalid(message.text)) {
      return res.status(200).json({success:false, message: "Please keep the conversation family friendly."})
    }
  const time = new Date();
  var chatId = message.chatID;
  const userId = req.userId;
  console.log(chatId, userId);
  
  if (message.text === "/newc") {
    const newChatID = await createNewChat(userId);
    return res.json({
      success:true,
      chatId: newChatID
    })
  } else if (message.text === "/newnc") {
    const newChatID = await createNewChat(userId);
    await db.query("UPDATE usercontext SET isUsable = 0 WHERE userID = ?", userId);
    return res.json({
      success:true,
      chatId: newChatID
    })
  }

  if (chatId === null || chatId === undefined) {
    chatId = await createNewChat(userId);
  }
  console.log(chatId);
  
  const [dbcontext] = await db.query("SELECT summary FROM userContext WHERE userID = ? AND isUsable = 1 ORDER BY createdAt DESC LIMIT 1;", [userId]);
  var userContext = null;
  if (dbcontext.length > 0) {
    userContext = dbcontext[0].summary;
  }
  try {

    const response = await getChatbotResponse(userContext, message.text);

    db.query("INSERT INTO chatbotMessages(chatID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, ?)", [chatId, message.text, "user", response.threatLevel || response.threat_level, time])

    db.query("INSERT INTO chatbotMessages(chatId, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, NOW())", [chatId, response.chatbotResponse, "bot", ""])

    db.query("INSERT INTO userContext (userID, summary, createdAt) VALUES (?, ?, NOW())", [userId, response.newUserContext]);
    return res.json({botReply: {sender: "bot", text:response.chatbotResponse, timestamp:time}, success:true})

  } catch (err) {
    console.error(err);
    res.status(500).json({message:"Internal error"})
  }


})

router.get("/messages", async (req, res) => {
  const userId = req.userId;
  const {chatID} = req.query;
  var sql;
  if (chatID === null || chatID === undefined) {
    sql = `SELECT chatID, sender, message AS text, sentAt AS timestamp FROM chatbotMessages  cm
JOIN chatbotchats cc ON cc.ID= cm.chatID
WHERE cc.userID = 11 AND chatID = (SELECT MAX(chatID) FROM chatbotmessages);`
  } else {
    sql = `
    SELECT chatID, sender, message AS text, sentAt AS timestamp FROM chatbotMessages WHERE userID = :userID AND chatID = :chatID
    `
  }
  const [messages] = await db.query(sql, {
    userID: userId,
    chatID: chatID
  });
  
  return res.json({messages});
})

module.exports = router;
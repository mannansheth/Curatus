const router = require("express").Router(),
  db = require("../config/dbConfig"),
  getReply = require("../services/chatbot"),
  v = require("../lib/validation"),
  filter = require("../middleware/filterMessage"),
  serialize = require("../services/serialize");
router.post("/message", async (req, res) =>
  serialize(req.userId, async () => {
    const { message } = req.body;
    if (!message || !v.text(message.text))
      return v.fail(res, "Message text required");
    if (filter(message.text))
      return res.json({
        success: false,
        message: "Please keep the conversation family friendly.",
      });
    const commandText = message.text.trim(),
      command = ["/newc", "/newnc"].includes(commandText);
    let chatId = message.chatID ?? message.chatId;
    if (chatId != null) {
      if (!v.id(chatId)) return v.fail(res);
      const [owned] = await db.query(
        "SELECT ID FROM chatbotchats WHERE ID = ? AND userID = ?",
        [chatId, req.userId],
      );
      if (!owned.length)
        return res.status(404).json({ message: "Chat not found" });
    }
    if (command) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [r] = await conn.query(
          "INSERT INTO chatbotchats (userID) VALUES (?)",
          [req.userId],
        );
        chatId = r.insertId;
        if (commandText === "/newnc")
          await conn.query(
            "UPDATE usercontext SET isUsable = 0 WHERE userID = ?",
            [req.userId],
          );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      return res.json({ success: true, chatId });
    }
    const [contexts] = await db.query(
      "SELECT summary FROM usercontext WHERE userID = ? AND isUsable = 1 ORDER BY createdAt DESC, ID DESC LIMIT 1",
      [req.userId],
    );
    const response = await getReply(contexts[0]?.summary || "", message.text);
    console.log(response)
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      if (chatId == null) {
        const [r] = await conn.query(
          "INSERT INTO chatbotchats (userID) VALUES (?)",
          [req.userId],
        );
        chatId = r.insertId;
      }
      await conn.query(
        "INSERT INTO chatbotmessages (chatID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, NOW())",
        [chatId,  message.text, "user", response.threatLevel],
      );
      await conn.query(
        "INSERT INTO chatbotmessages (chatID, message, sender, riskLevel, sentAt) VALUES (?, ?, ?, ?, NOW())",
        [
          chatId,
          response.chatbotResponse,
          "bot",
          response.threatLevel,
        ],
      );
      await conn.query(
        "INSERT INTO usercontext (userID, summary, createdAt) VALUES (?, ?, NOW())",
        [req.userId, response.newUserContext],
      );
      await conn.commit();
    } catch (e) {
      console.log(e)
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    res.json({
      success: true,
      chatId,
      botReply: {
        chatID: chatId,
        sender: "bot",
        text: response.chatbotResponse,
        timestamp: new Date(),
        threatLevel: response.threatLevel,
      },
    });
  }),
);
router.get("/messages", async (req, res) => {
  const { chatID } = req.query;
  if (chatID != null && !v.id(chatID)) return v.fail(res);
  const [messages] = await db.query(
    "SELECT cm.chatID, cm.sender, cm.message AS text, cm.sentAt AS timestamp FROM chatbotmessages cm JOIN chatbotchats cc ON cc.ID = cm.chatID WHERE cc.userID = ? AND cc.ID = COALESCE(?, (SELECT MAX(ID) FROM chatbotchats WHERE userID = ?)) ORDER BY cm.ID",
    [req.userId, chatID ?? null, req.userId],
  );
  res.json({ messages });
});
module.exports = router;

const express = require("express");
const db = require("../config/dbConfig");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const isMessageInvalid = require("../middleware/filterMessage")
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
    if (isMessageInvalid(message.content)) {
      return res.status(200).json({success:false, message: "Please keep the conversation family friendly."})
    }

    
    if (!message || !message.content) {
      return res.status(400).json({ message: "Message content required" });
    }


    const now = new Date();

    if (message.name === "Anonymous" || !userID) {
      const ip = req.ip;

      const [rows] = await db.query(
        "SELECT COUNT(*) AS count FROM messages WHERE ipAddress = ? AND createdAt > NOW() - INTERVAL 5 MINUTE",
        [ip]
      );

      if (rows.length > 0) {
        const count = rows[0].count;

        if (count >= 2) {
          return res.status(200).json({
            success:false,
            message: "Anonymous users can send only 2 message every 5 minutes"
          });
        }
      }

      await db.query(
        "INSERT INTO messages (content, userID, ipAddress, createdAt, isAnonymous, usedName) VALUES (?, NULL, ?, ?, ?, ?)",
        [message.content, ip, now, message.isAnonymous, !message.isAnonymous ? message.usedName : null]
      );

    } 
    else {
      

      const [rows] = await db.query(
        "SELECT COUNT(*) AS count FROM messages WHERE userID = ? AND createdAt > NOW() - INTERVAL 2 MINUTE",
        [userID]
      );
      if (rows.length > 0) {
        const count = new Date(rows[0].count);
        if (count >=5 ) {
          return res.status(200).json({
            success:false,
            message:"You can send only 5 messages every 2 minutes."
          })
        }
      }

      await db.query(
        "INSERT INTO messages (content, userID, ipAddress, createdAt, isAnonymous, usedName) VALUES (?, ?, NULL, ?, ?, ?)",
        [message.content, userID, now, message.isAnonymous, !message.isAnonymous ? message.usedName === "" ? null : message.usedName : null]
      );
    }

    return res.json({ success: true });


  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});
const getMessages = async  (userID, ip) => {
  const [messages] = await db.query(`
    SELECT 
    m.ID, 
    m.content, 
    m.createdAt,
    CASE WHEN m.isAnonymous = 1 THEN
      "Anonymous"
    ELSE 
      CASE WHEN m.userID IS NULL THEN 
        m.usedName
      ELSE 
        CASE WHEN m.usedName IS NULL THEN
          u.Name
        ELSE 
          m.usedName
        END
      END
    END AS Name,

    m.ipAddress, 
    m.userID , 
    m.isAnonymous, 
    GROUP_CONCAT(r.reaction) AS reactions
    FROM messages m  
    LEFT JOIN users u ON u.ID = m.userID
    LEFT JOIN reactions r ON r.messageID = m.ID
    WHERE m.createdAt >= NOW() - INTERVAL 2 HOUR
    GROUP BY m.ID
    ORDER BY m.createdAt;
     `)
     messages.forEach(m => {
    m["isOwn"] = (userID === m.userID) || (ip === m.ipAddress) && !userID;
    reactions = {};
    if (m["reactions"] === null) {
      m["reactions"] = [];
    } else {
      re = m["reactions"].split(",");
      re.forEach(r => {
        reactions[r] = (reactions[r] || 0) + 1
      }) 
      m["reactions"] = reactions
    }
    
  })
    return messages;
}
router.get("/messages", async (req, res) => {
  let userID = null;

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      userID = decoded.id;
    } catch (err) {

      console.log("error")
    }
  }
  const ip = req.ip;
  const messages = await getMessages(userID, ip);
  
  return res.json({messages})
})

router.post('/posts/:postID/react', async (req, res) => {
  const {reaction} = req.body;
  const postID = req.params.postID;
  let userID = null;

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userID = decoded.id;
    } catch (err) {
      console.log("error")
    }
  }
  const ip = req.ip;

  const [response] = await db.query(
    `SELECT COUNT(*) AS count 
    FROM reactions 
    WHERE messageID = ? 
    AND (
      (userID IS NOT NULL AND userID = ?) 
      OR 
      (userID IS NULL AND ipAddress = ?)
    )`,
    [postID, userID, ip]
  );
  if (response[0].count > 1) {
    await db.query(`
    UPDATE reactions SET reaction = ?, createdAt = NOW() 
    WHERE  
    id = ( 
      SELECT id FROM (
        SELECT id 
        FROM reactions
        WHERE 
        messageID = ? AND 
        (
        (userID IS NOT NULL AND userID = ?)
        OR
        (userID IS NULL AND ipAddress = ?)
        )
        ORDER BY createdAt ASC LIMIT 1
      ) AS t
      
    )
      `, 
      [reaction, postID, userID, ip]);
  } else {
    await db.query("INSERT INTO reactions (userID, messageID, ipAddress, reaction) VALUES (?, ?, ?, ?)", [userID, postID, userID ? null : ip, reaction]);
  }
  const messages = await getMessages(userID, ip);
  return res.json({success: true, messages})
})

module.exports = router;

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
        "SELECT COUNT(*) AS count FROM messages WHERE ipAddress = ? AND createdAt > NOW() - INTERVAL 30 MINUTE",
        [ip]
      );

      if (rows.length > 0) {
        const count = rows[0].count;

        if (count >= 1) {
          return res.status(200).json({
            success:false,
            message: "Anonymous users can send only 1 message every 30 minutes"
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
        "SELECT COUNT(*) AS count FROM messages WHERE userID = ? AND createdAt > NOW() - INTERVAL 10 MINUTE",
        [userID]
      );
      if (rows.length > 0) {
        const count = new Date(rows[0].count);
        if (count >=3 ) {
          return res.status(200).json({
            success:false,
            message:"You can send only 3 messages every 10 minutes."
          })
        }
      }

      await db.query(
        "INSERT INTO messages (content, userID, ipAddress, createdAt, isAnonymous) VALUES (?, ?, NULL, ?, ?)",
        [message.content, userID, now, message.isAnonymous]
      );
    }

    return res.json({ success: true });


  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});
const getMessages = async  (userID, ip) => {
  const [messages] = await db.query(`SELECT m.ID, m.content, m.createdAt, u.Name, m.ipAddress, m.userID , m.isAnonymous, GROUP_CONCAT(r.reaction) AS reactions
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
  console.log(postID, reaction);
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
  console.log(ip);
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
  if (response[0].count > 0) {
    await db.query(`UPDATE reactions SET reaction = ? 
    WHERE messageID = ? 
    AND (
      (userID IS NOT NULL AND userID = ?) 
      OR 
      (userID IS NULL AND ipAddress = ?)
    )`, [reaction, postID, userID, ip]);
  } else {
    await db.query("INSERT INTO reactions (userID, messageID, ipAddress, reaction) VALUES (?, ?, ?, ?)", [userID, postID, userID ? null : ip, reaction]);
  }
  const messages = await getMessages(userID, ip);
  return res.json({success: true, messages})
})

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig");
const isMessageInvalid = require("../middleware/filterMessage")
const updateStatus = async () => {
  await db.query(`UPDATE appointments SET status = 'completed' 
    WHERE status = 'upcoming' 
    AND NOW() > TIMESTAMP(date, time);
    `)
}
router.post("/book", async (req, res) => {
  const userId = req.userId;
  const {therapistId, date, time} = req.body;

  await db.query(`INSERT INTO appointments (userID, therapistID, date, time, status, preRemarks) 
    VALUES (?, ?, ?, ?, ?, 
    ( SELECT summary FROM userContext WHERE userID = ? ORDER BY createdAt DESC LIMIT 1
    )
    )`, [userId, therapistId, date, time, "upcoming", userId]);

  return res.json({success:true});

})

router.get("/user", async (req, res) => {
  const userId = req.userId;
  await updateStatus();
  const [response] = await db.query(`SELECT 
  a.ID,
  u.Name AS therapistName,
  a.date,
  a.time,
  a.status,
  a.postRemarks,
  t.mode,
  t.city,
  COUNT(m.ID) AS unreadCount
FROM appointments a
JOIN users u ON u.ID = a.therapistID
JOIN therapists t ON t.userID = a.therapistID
LEFT JOIN personalchats m 
  ON m.aptID = a.ID 
  AND m.sentBy != ? 
  AND m.status = 'delivered'
WHERE a.userID = ?
GROUP BY a.ID;`, [userId, userId]); 
  
    
  return res.json({appointments: response})
})
router.get("/therapist", async (req, res) => {
  const userId = req.userId;
  await updateStatus();
  const [response] = await db.query(`SELECT 
  a.ID, 
  u.Name AS patientName, 
  a.date, 
  a.time, 
  a.status, 
  a.preRemarks, 
  t.mode, 
  t.city, 
  a.postRemarks, 
  COUNT(m.ID) AS unreadCount
FROM appointments a 
JOIN users u ON u.ID = a.userID
JOIN therapists t ON t.userID = a.therapistID
LEFT JOIN personalchats m 
  ON m.aptID = a.ID 
  AND m.sentBy != ?
  AND m.status = 'delivered'
WHERE a.therapistID = ?
GROUP BY a.ID;`, [userId, userId]); 

  return res.json({appointments: response})
})

router.get("/slots", async (req, res) => {
  const {therapistId, date} = req.query;
  const userId = req.userId;
  const [response] = await db.query("SELECT startTime, endTime FROM therapists WHERE userID = ?", [therapistId]);
  
  const {startTime, endTime} = response[0];

  const [bookedForTherapist] = await db.query("SELECT time FROM appointments WHERE therapistID = ? AND date = ?", [therapistId, date]);

  const [bookedForUser] = await db.query("SELECT time FROM appointments WHERE userID = ? AND date = ?", [userId, date]);

  const therapistBookedSet = new Set(
    bookedForTherapist.map(b => b.time)
  );

  const userBookedSet = new Set(
    bookedForUser.map(b => b.time)
  );
  const slots = [];

  let current = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  while (current < end) {
    const timeStr = current.toTimeString().slice(0, 8); // HH:MM:SS

    const isBooked =
      therapistBookedSet.has(timeStr) ||
      userBookedSet.has(timeStr);

    slots.push({
      time: timeStr,
      booked: isBooked
    });

    // increment 1 hour
    current.setHours(current.getHours() + 1);
  }

  return res.json({slots});
  
})
router.put('/remark', async (req, res) => {
  const {id, remarks} = req.body;
  await db.query("UPDATE appointments SET postRemarks = ? WHERE ID = ?", [remarks, id]);

  return res.json({success:true})
})
router.get("/chat/messages", async (req, res) => {
  const {aptId} = req.query;
  const userId = req.userId;
  await db.query(`
    UPDATE personalchats
SET status = 'read'
WHERE (aptID = ?)
  AND sentBy != ?
  AND status = 'delivered';`, [aptId,userId,  userId])
  const [messages] = await db.query(`
      SELECT content, sentBy, status, createdAt FROM personalchats WHERE aptID = ? OR ? IN (SELECT userID FROM therapists)
    `, [aptId, userId]);
  
  const [names] = await db.query(`
      SELECT p.ID AS patientID, p.Name AS patientName, t.ID AS therapistID, t.Name AS therapistName
      FROM appointments a
      LEFT JOIN users p ON p.ID = a.userID
      LEFT JOIN users t ON t.ID = a.therapistID
      WHERE a.ID = ?  
    `, [aptId])
  for (m of messages) {
    m["isOwn"] = m["sentBy"] === userId
  }

  var chatWith;
  if (userId === names[0].patientID) {
    chatWith = names[0].therapistName
  } else if (userId === names[0].therapistID) {
    chatWith = names[0].patientName
  }
    return res.json({messages, chatWith})
})


router.post("/chat/message", async (req, res) => {
  const userId = req.userId;
  const { message, aptId } = req.body;

  if (isMessageInvalid(message.content)) {
    return res.json({ success: false, message: "Please keep the chat family friendly." });
  }

  await db.query(`
    INSERT INTO personalchats (aptID, content, sentBy, status, createdAt) 
    VALUES (?, ?, ?, "delivered", NOW())
  `, [aptId, message.content, userId]);
    
  const [[row]] = await db.query(`
  SELECT 
    CASE 
      WHEN userID = ? THEN therapistID 
      ELSE userID 
    END AS receiverId
  FROM appointments
  WHERE ID = ?
`, [userId, aptId]);

const receiverId = row.receiverId;
  
  const chatPayload = {
    content: message.content,
    createdAt: new Date(),
    isOwn: false, 
    sentBy: userId,
    aptId : aptId,

  }; 


  if (req.io) {

    req.io.to(`apt_${aptId}`).emit('receive_message', chatPayload);
    
    console.log(userId, receiverId);
    
    req.io.to(`user_${receiverId}`).emit('new_message_notification', {
      aptId,
      sentBy: userId
    });
  }
  return res.json({ success: true });
});

 
module.exports = router;
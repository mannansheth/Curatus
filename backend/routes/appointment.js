const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig");

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
  const [response] = await db.query(`SELECT a.ID, u.Name AS therapistName, a.date, a.time, a.status, a.postRemarks, t.mode, t.city 
    FROM appointments a 
    JOIN users u ON u.ID = a.therapistID
    JOIN therapists t ON t.userID = a.therapistID
    WHERE a.userID = ?`, [userId]); 

  return res.json({appointments: response})
})
router.get("/therapist", async (req, res) => {
  const userId = req.userId;
  await updateStatus();
  const [response] = await db.query(`SELECT a.ID, u.Name AS patientName, a.date, a.time, a.status, a.preRemarks, t.mode, t.city, a.postRemarks 
    FROM appointments a 
    JOIN users u ON u.ID = a.userID
    JOIN therapists t ON t.userID = a.therapistID
    WHERE a.therapistID = ?`, [userId]); 

  return res.json({appointments: response})
})

router.get("/slots", async (req, res) => {
  const {therapistId, date} = req.query;
  console.log(req.query);
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

module.exports = router;
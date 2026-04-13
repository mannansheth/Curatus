const express = require("express");

const db = require("../config/dbConfig");

const router = express.Router();


router.get("/stats", async (req, res) => {
  const userID = req.userId;
  const [entries] = await db.query("SELECT * FROM journal_entries WHERE userID = ? ORDER BY createdAt DESC", [userID]);

  const [assessmentEntries] = await db.query("SELECT 1 FROM assessment WHERE userID = ?", [userID])

  return res.json({entries, hasSubmitted: assessmentEntries.length > 0});

})

router.post("/assessment", async (req, res) => {
  const userID = req.userId;
  const {data} = req.body
  await db.query("INSERT INTO assessment (userID, data) VALUES (?, ?)", [userID, JSON.stringify(data)]);
  return res.json({success:true})
})

router.get("/profile", async (req, res) => {
  const userID = req.userId;

  const [userData] = await db.query(`
      SELECT u.ID,u.createdDate AS startDate, j.count AS journalEntries, c.count AS communityMessages FROM users u
LEFT JOIN (SELECT je.userID, COUNT(*) AS count FROM journal_entries je WHERE je.userID = :userID GROUP BY je.userID) j ON j.userID = u.ID
LEFT JOIN (SELECT cm.userID, COUNT(*) AS count FROM messages cm WHERE cm.userID = :userID GROUP BY cm.userID) c ON c.userID = u.ID
WHERE u.ID = :userID;
    `, {
      userID : userID
    })
  return res.json({userData: userData[0]});
})
module.exports = router;

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
module.exports = router;

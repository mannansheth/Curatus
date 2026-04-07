const express = require("express");
const db = require("../config/dbConfig");
const axios = require("axios"); 
const router = express.Router();

router.post("/addEntry", async (req, res) => {
  const {id, content, timestamp} = req.body;
  const userId = req.userId;
  const response = await axios.post("http://localhost:8000/journal/entry/analyze", {text: content});

  const entry = {
    id, 
    content, 
    timestamp,
    mood: response.data.result.mood,
    score: response.data.result.score,
    emoji: response.data.result.emoji,
  }

  const [dbresponse] = await db.query("INSERT INTO journal_entries (userId, content, createdAt, mood, score, emoji) VALUES (?, ?, ?, ?, ?, ?)", [userId, entry.content, new Date(), entry.mood, entry.score, entry.emoji]);

  res.status(200).json({
    success:true,
    entry:entry
  })

})
router.get("/entries", async (req, res) => {
  const userId = req.userId;

  const [entries] = await db.query("SELECT * FROM journal_entries WHERE userID = ? AND createdAt > NOW() - INTERVAL 3 DAY ORDER BY createdAt DESC", [userId]);

  res.status(200).json({
    entries
  })
})
module.exports = router;
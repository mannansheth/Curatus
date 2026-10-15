const router = require("express").Router(),
  db = require("../config/dbConfig"),
  axios = require("axios"),
  v = require("../lib/validation");
router.post("/addEntry", async (req, res) => {
  const { content } = req.body;
  if (!v.text(content))
    return v.fail(res, "Journal content required (maximum 10000 characters)");
  let result;
  try {
    const response = await axios.post(
      (process.env.PYTHON_API_URL || "http://localhost:8000") +
        "/journal/entry/analyze",
      { text: content },
      { timeout: 30000 },
    );
    result = response.data.success === true ? response.data.result : null;
  } catch {
    return res.status(502).json({
      success: false,
      message: "Journal analysis service unavailable",
    });
  }
  if (
    !result ||
    !v.text(result.mood, 100) ||
    !v.text(result.emoji, 100) ||
    !Number.isInteger(result.score) ||
    result.score < 1 ||
    result.score > 10 ||
    ![
      "Very Negative",
      "Negative",
      "Neutral",
      "Positive",
      "Very Positive",
    ].includes(result.mood)
  )
    return res
      .status(502)
      .json({ message: "Invalid journal analysis response" });
  const timestamp = new Date();
  const [r] = await db.query(
    "INSERT INTO journal_entries (userID, content, createdAt, mood, score, emoji) VALUES (?, ?, ?, ?, ?, ?)",
    [req.userId, content, timestamp, result.mood, result.score, result.emoji],
  );
  res.json({
    success: true,
    entry: { id: r.insertId, content, timestamp, ...result },
  });
});
router.get("/entries", async (req, res) => {
  const [entries] = await db.query(
    "SELECT * FROM journal_entries WHERE userID = ? AND createdAt > NOW() - INTERVAL 3 DAY ORDER BY createdAt DESC, ID DESC",
    [req.userId],
  );
  res.json({ entries });
});
router.delete("/:id", async (req, res) => {
  if (!v.id(req.params.id)) return v.fail(res);
  const [result] = await db.query(
    "DELETE FROM journal_entries WHERE ID=? AND userID=?",
    [req.params.id, req.userId],
  );
  if (!result.affectedRows)
    return res.status(404).json({ message: "Journal entry not found" });
  res.json({ success: true });
});
module.exports = router;

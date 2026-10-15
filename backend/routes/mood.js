const router = require("express").Router(),
  db = require("../config/dbConfig"),
  axios = require("axios"),
  v = require("../lib/validation");
router.get("/history", async (req, res) => {
  const [entries] = await db.query(
    "SELECT ID,createdAt,mood,score,emoji FROM journal_entries WHERE userID=? ORDER BY createdAt DESC",
    [req.userId],
  );
  res.json({ entries });
});
router.post("/analyze", async (req, res) => {
  const text = req.body.text ?? req.body.content;
  if (!v.text(text)) return v.fail(res, "Text required");
  try {
    const response = await axios.post(
      (process.env.PYTHON_API_URL || "http://localhost:8000") +
        "/journal/entry/analyze",
      { text },
      { timeout: 30000 },
    );
    const result = response.data.result;
    if (
      response.data.success !== true ||
      !result ||
      !Number.isInteger(result.score) ||
      result.score < 1 ||
      result.score > 10 ||
      ![
        "Very Negative",
        "Negative",
        "Neutral",
        "Positive",
        "Very Positive",
      ].includes(result.mood) ||
      !v.text(result.emoji, 100)
    )
      throw new Error();
    res.json({ success: true, result });
  } catch {
    return res
      .status(502)
      .json({ success: false, message: "Mood analysis service unavailable" });
  }
});
module.exports = router;

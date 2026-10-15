const router = require("express").Router(),
  db = require("../config/dbConfig"),
  v = require("../lib/validation"),
  bcrypt = require("bcryptjs");
router.get("/stats", async (req, res) => {
  const [entries] = await db.query(
    "SELECT * FROM journal_entries WHERE userID = ? ORDER BY createdAt DESC",
    [req.userId],
  );
  const [assessments] = await db.query(
    "SELECT 1 FROM assessment WHERE userID = ?",
    [req.userId],
  );
  res.json({ entries, hasSubmitted: assessments.length > 0 });
});
router.post("/assessment", async (req, res) => {
  const { data } = req.body;
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== 8 ||
    [
      "anxiety",
      "sleep",
      "mood",
      "stress",
      "social",
      "energy",
      "focus",
      "hope",
    ].some((k) => !Number.isInteger(data[k]) || data[k] < 0 || data[k] > 4)
  )
    return v.fail(res, "Assessment data must be an object");
  await db.query("INSERT INTO assessment (userID, data) VALUES (?, ?)", [
    req.userId,
    JSON.stringify(data),
  ]);
  res.json({ success: true, ...require("../lib/assessment")(data) });
});
router.get("/profile", async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.ID,u.Name AS name,u.Email AS email,u.phone,u.bio,u.createdDate AS startDate,(SELECT COUNT(*) FROM journal_entries WHERE userID=u.ID) AS journalEntries,(SELECT COUNT(*) FROM messages WHERE userID=u.ID) AS communityMessages FROM users u WHERE u.ID=?`,
    [req.userId],
  );
  if (!rows.length) return res.status(404).json({ message: "User not found" });
  res.json({ userData: rows[0] });
});
router.put("/profile", async (req, res) => {
  const { name, email, phone = "", bio = "" } = req.body;
  if (
    !v.text(name, 255) ||
    !v.email(email) ||
    typeof phone !== "string" ||
    phone.length > 20 ||
    typeof bio !== "string" ||
    bio.length > 10000
  )
    return v.fail(res, "Invalid profile");
  try {
    await db.query(
      "UPDATE users SET Name=?, Email=?, phone=?, bio=? WHERE ID=?",
      [name.trim(), email.trim().toLowerCase(), phone, bio, req.userId],
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Email already registered" });
    throw e;
  }
  res.json({ success: true });
});
router.put("/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (
    !v.password(currentPassword) ||
    !v.password(newPassword) ||
    newPassword.length < 8
  )
    return v.fail(res, "Password must be 8-72 characters");
  const [users] = await db.query("SELECT Password FROM users WHERE ID=?", [
    req.userId,
  ]);
  if (
    !users.length ||
    !(await bcrypt.compare(currentPassword, users[0].Password))
  )
    return res.status(403).json({ message: "Current password incorrect" });
  await db.query("UPDATE users SET Password=? WHERE ID=?", [
    await bcrypt.hash(newPassword, 10),
    req.userId,
  ]);
  res.json({ success: true });
});
router.delete("/account", async (req, res) => {
  if (!v.password(req.body.password)) return v.fail(res, "Password required");
  const [users] = await db.query("SELECT Password FROM users WHERE ID=?", [
    req.userId,
  ]);
  if (
    !users.length ||
    !(await bcrypt.compare(req.body.password, users[0].Password))
  )
    return res.status(403).json({ message: "Password incorrect" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE pc FROM personalchats pc JOIN appointments a ON a.ID=pc.aptID WHERE a.userID=? OR a.therapistID=?",
      [req.userId, req.userId],
    );
    await conn.query("DELETE FROM personalchats WHERE sentBy=?", [req.userId]);
    await conn.query(
      "DELETE FROM appointments WHERE userID=? OR therapistID=?",
      [req.userId, req.userId],
    );
    await conn.query("DELETE FROM reactions WHERE userID=?", [req.userId]);
    await conn.query(
      "UPDATE messages SET userID=NULL, usedName=NULL, isAnonymous=1 WHERE userID=?",
      [req.userId],
    );
    for (const table of [
      "assessment",
      "chatbotmessages",
      "chatbotchats",
      "journal_entries",
      "usercontext",
      "therapists",
    ])
      await conn.query("DELETE FROM " + table + " WHERE userID=?", [
        req.userId,
      ]);
    await conn.query("DELETE FROM users WHERE ID=?", [req.userId]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ success: true });
});
module.exports = router;

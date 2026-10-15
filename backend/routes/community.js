const router = require("express").Router(),
  db = require("../config/dbConfig"),
  v = require("../lib/validation"),
  filter = require("../middleware/filterMessage"),
  auth = require("../middleware/authenticateToken");
const serialize = require("../services/serialize");
router.use((req, res, next) => {
  try {
    req.communityUserId =
      auth.decodeToken(req.headers.authorization)?.id || null;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});
async function getMessages(userId, ip) {
  const [messages] = await db.query(
    `SELECT m.ID,m.content,m.createdAt,CASE WHEN m.isAnonymous=1 THEN 'Anonymous' ELSE COALESCE(m.usedName,u.Name,'Anonymous') END AS Name,m.ipAddress,m.userID,m.isAnonymous,GROUP_CONCAT(r.reaction) AS reactions FROM messages m LEFT JOIN users u ON u.ID=m.userID LEFT JOIN reactions r ON r.messageID=m.ID WHERE m.createdAt>=NOW()-INTERVAL 2 HOUR GROUP BY m.ID ORDER BY m.createdAt,m.ID`,
  );
  return messages.map((m) => {
    const reactions = {};
    for (const r of (m.reactions || "").split(",").filter(Boolean))
      reactions[r] = (reactions[r] || 0) + 1;
    const isOwn =
      userId != null
        ? Number(userId) === Number(m.userID)
        : m.userID == null && ip === m.ipAddress;
    const { ipAddress, userID, ...publicFields } = m;
    return { ...publicFields, isOwn, reactions };
  });
}
router.post(["/message", "/posts"], async (req, res) =>
  serialize("community:" + (req.communityUserId || req.ip), async () => {
    if (req.path === "/posts") req.body = { message: req.body };
    const { message } = req.body;
    if (
      !message ||
      !v.text(message.content) ||
      (message.isAnonymous !== undefined &&
        typeof message.isAnonymous !== "boolean") ||
      (message.usedName != null &&
        (typeof message.usedName !== "string" || message.usedName.length > 100))
    )
      return v.fail(res, "Message content required");
    if (filter(message.content))
      return res.json({
        success: false,
        message: "Please keep the conversation family friendly.",
      });
    const userId = req.communityUserId,
      anonymous = message.isAnonymous !== false;
    if (!anonymous && !userId && !v.text(message.usedName, 100))
      return v.fail(res, "Display name required for a named guest post");
    const [rows] = await db.query(
      userId
        ? "SELECT COUNT(*) AS count FROM messages WHERE userID=? AND createdAt>NOW()-INTERVAL 2 MINUTE"
        : "SELECT COUNT(*) AS count FROM messages WHERE ipAddress=? AND createdAt>NOW()-INTERVAL 5 MINUTE",
      [userId || req.ip],
    );
    if (Number(rows[0].count) >= (userId ? 5 : 2))
      return res.json({
        success: false,
        message: userId
          ? "You can send only 5 messages every 2 minutes."
          : "Anonymous users can send only 2 messages every 5 minutes",
      });
    await db.query(
      "INSERT INTO messages (content,userID,ipAddress,createdAt,isAnonymous,usedName) VALUES (?,?,?,NOW(),?,?)",
      [
        message.content,
        userId,
        userId ? null : req.ip,
        anonymous ? 1 : 0,
        anonymous ? null : message.usedName?.trim() || null,
      ],
    );
    res.json({ success: true });
  }),
);
router.get(["/messages", "/posts"], async (req, res) =>
  res.json({ messages: await getMessages(req.communityUserId, req.ip) }),
);
router.post("/posts/:postID/react", async (req, res) => {
  const { reaction } = req.body,
    postID = req.params.postID,
    userId = req.communityUserId;
  if (!v.id(postID) || !v.text(reaction, 32) || reaction.includes(","))
    return v.fail(res, "Invalid reaction");
  const [posts] = await db.query("SELECT ID FROM messages WHERE ID=?", [
    postID,
  ]);
  if (!posts.length) return res.status(404).json({ message: "Post not found" });
  // Serialize concurrent reactions for this post, preventing duplicate reactions by one identity.
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SELECT ID FROM messages WHERE ID=? FOR UPDATE", [postID]);
    const [rows] = await conn.query(
      "SELECT ID FROM reactions WHERE messageID=? AND ((userID IS NOT NULL AND userID=?) OR (userID IS NULL AND ipAddress=?)) ORDER BY ID",
      [postID, userId, userId ? null : req.ip],
    );
    if (rows.length) {
      await conn.query(
        "UPDATE reactions SET reaction=?,createdAt=NOW() WHERE ID=?",
        [reaction, rows[0].ID],
      );
      if (rows.length > 1)
        await conn.query(
          "DELETE FROM reactions WHERE messageID=? AND ID<>? AND ((userID IS NOT NULL AND userID=?) OR (userID IS NULL AND ipAddress=?))",
          [postID, rows[0].ID, userId, userId ? null : req.ip],
        );
    } else
      await conn.query(
        "INSERT INTO reactions (userID,messageID,ipAddress,reaction) VALUES (?,?,?,?)",
        [userId, postID, userId ? null : req.ip, reaction],
      );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ success: true, messages: await getMessages(userId, req.ip) });
});
router.delete("/posts/:postID", async (req, res) => {
  if (!v.id(req.params.postID)) return v.fail(res);
  const [posts] = await db.query(
    "SELECT userID,ipAddress FROM messages WHERE ID=?",
    [req.params.postID],
  );
  const post = posts[0];
  if (
    !post ||
    (req.communityUserId
      ? Number(post.userID) !== req.communityUserId
      : post.userID != null || post.ipAddress !== req.ip)
  )
    return res.status(404).json({ message: "Post not found" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM reactions WHERE messageID=?", [
      req.params.postID,
    ]);
    await conn.query("DELETE FROM messages WHERE ID=?", [req.params.postID]);
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

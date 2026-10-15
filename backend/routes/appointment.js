const router = require("express").Router(),
  db = require("../config/dbConfig"),
  v = require("../lib/validation"),
  filter = require("../middleware/filterMessage"),
  access = require("../services/appointmentAccess"),
  markRead = require("../services/UpdateMessageStatus"),
  s = require("../lib/slots");
const missing = (res) =>
  res.status(404).json({ message: "Appointment not found" });
const updateStatus = () =>
  db.query(
    "UPDATE appointments SET status='completed' WHERE status='upcoming' AND NOW() > TIMESTAMP(date,time) + INTERVAL 1 HOUR",
  );
router.post("/book", async (req, res) => {
  const { therapistId, date, time } = req.body;
  if (
    !v.id(therapistId) ||
    !v.date(date) ||
    !v.time(time) ||
    Number(therapistId) === req.userId ||
    new Date(date + "T" + v.normalizeTime(time)) <= new Date()
  )
    return v.fail(res, "Invalid therapist or future appointment time");
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Lock both accounts in a stable order so concurrent requests cannot double-book either participant.
    await conn.query(
      "SELECT ID FROM users WHERE ID IN (?, ?) ORDER BY ID FOR UPDATE",
      [req.userId, therapistId],
    );
    const [profiles] = await conn.query(
      "SELECT * FROM therapists WHERE userID=?",
      [therapistId],
    );
    if (!profiles.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Therapist not found" });
    }
    const profile = profiles[0],
      normalized = v.normalizeTime(time);
    if (
      !s.available(profile, date) ||
      !s.slots(profile.startTime, profile.endTime).includes(normalized)
    ) {
      await conn.rollback();
      return v.fail(res, "Time outside therapist availability");
    }
    const [conflicts] = await conn.query(
      "SELECT ID FROM appointments WHERE date=? AND ABS(TIME_TO_SEC(time)-TIME_TO_SEC(?)) < 3600 AND status <> 'cancelled' AND (userID IN (?, ?) OR therapistID IN (?, ?))",
      [date, normalized, req.userId, therapistId, req.userId, therapistId],
    );
    if (conflicts.length) {
      await conn.rollback();
      return res
        .status(409)
        .json({ success: false, message: "Time slot already booked" });
    }
    const [result] = await conn.query(
      "INSERT INTO appointments (userID,therapistID,date,time,status,preRemarks) VALUES (?,?,?,?,'upcoming',(SELECT summary FROM usercontext WHERE userID=? AND isUsable=1 ORDER BY createdAt DESC,ID DESC LIMIT 1))",
      [req.userId, therapistId, date, normalized, req.userId],
    );
    await conn.commit();
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});
for (const role of ["user", "therapist"])
  router.get("/" + role, async (req, res) => {
    await updateStatus();
    const [appointments] = await db.query(
      `SELECT a.*, u.Name AS ${role === "user" ? "therapistName" : "patientName"}, t.mode,t.city,(SELECT COUNT(*) FROM personalchats m WHERE m.aptID=a.ID AND m.sentBy!=? AND m.status='delivered') AS unreadCount FROM appointments a JOIN users u ON u.ID=a.${role === "user" ? "therapistID" : "userID"} JOIN therapists t ON t.userID=a.therapistID WHERE a.${role === "user" ? "userID" : "therapistID"}=? ORDER BY a.date DESC,a.time DESC`,
      [req.userId, req.userId],
    );
    res.json({ appointments });
  });
router.get("/slots", async (req, res) => {
  const { therapistId, date } = req.query;
  if (!v.id(therapistId) || !v.date(date)) return v.fail(res);
  const [profiles] = await db.query(
    "SELECT startTime,endTime,availableDays FROM therapists WHERE userID=?",
    [therapistId],
  );
  if (!profiles.length)
    return res.status(404).json({ message: "Therapist not found" });
  if (!s.available(profiles[0], date)) return res.json({ slots: [] });
  const [bookings] = await db.query(
    "SELECT time FROM appointments WHERE date=? AND status <> 'cancelled' AND (userID IN (?, ?) OR therapistID IN (?, ?))",
    [date, req.userId, therapistId, req.userId, therapistId],
  );
  res.json({
    slots: s.slots(profiles[0].startTime, profiles[0].endTime).map((time) => ({
      time,
      booked:
        bookings.some((b) => s.overlaps(b.time, time)) ||
        new Date(date + "T" + time) <= new Date(),
    })),
  });
});
router.put("/remark", async (req, res) => {
  const { id, remarks } = req.body;
  if (!v.id(id) || typeof remarks !== "string" || remarks.length > 10000)
    return v.fail(res);
  const apt = await access(id, req.userId);
  if (!apt) return missing(res);
  if (apt.therapistID !== req.userId)
    return res
      .status(403)
      .json({ message: "Only the assigned therapist may add remarks" });
  await db.query(
    "UPDATE appointments SET postRemarks=? WHERE ID=? AND therapistID=?",
    [remarks, id, req.userId],
  );
  res.json({ success: true });
});
router.get("/chat/messages", async (req, res) => {
  const { aptId } = req.query;
  if (!v.id(aptId)) return v.fail(res);
  const apt = await access(aptId, req.userId);
  if (!apt) return missing(res);
  await markRead(aptId, req.userId);
  const [messages] = await db.query(
    "SELECT ID,content,sentBy,status,createdAt FROM personalchats WHERE aptID=? ORDER BY ID",
    [aptId],
  );
  res.json({
    messages: messages.map((m) => ({ ...m, isOwn: m.sentBy === req.userId })),
    chatWith: apt.userID === req.userId ? apt.therapistName : apt.patientName,
  });
});
router.post("/chat/message", async (req, res) => {
  const { message, aptId } = req.body;
  if (!v.id(aptId) || !message || !v.text(message.content)) return v.fail(res);
  const apt = await access(aptId, req.userId);
  if (!apt) return missing(res);
  if (apt.status === "cancelled")
    return res.status(409).json({ message: "Appointment cancelled" });
  if (filter(message.content))
    return res.json({
      success: false,
      message: "Please keep the chat family friendly.",
    });
  await db.query(
    "INSERT INTO personalchats (aptID,content,sentBy,status,createdAt) VALUES (?,?,?,'delivered',NOW())",
    [aptId, message.content, req.userId],
  );
  const payload = {
    content: message.content,
    createdAt: new Date(),
    sentBy: req.userId,
    aptId,
    status: "delivered",
  };
  req.io?.to("apt_" + aptId).emit("receive_message", payload);
  req.io
    ?.to("user_" + (apt.userID === req.userId ? apt.therapistID : apt.userID))
    .emit("new_message_notification", { aptId, sentBy: req.userId });
  res.json({ success: true });
});
router.delete("/:id", async (req, res) => {
  if (!v.id(req.params.id)) return v.fail(res);
  const apt = await access(req.params.id, req.userId);
  if (!apt) return missing(res);
  if (apt.status === "completed" || s.expired(apt))
    return res
      .status(409)
      .json({ message: "Completed appointments cannot be cancelled" });
  await db.query("UPDATE appointments SET status='cancelled' WHERE ID=?", [
    req.params.id,
  ]);
  res.json({ success: true });
});
router.put("/:id/reschedule", async (req, res) => {
  const { date, time } = req.body;
  if (
    !v.id(req.params.id) ||
    !v.date(date) ||
    !v.time(time) ||
    new Date(date + "T" + v.normalizeTime(time)) <= new Date()
  )
    return v.fail(res, "Future appointment time required");
  const apt = await access(req.params.id, req.userId);
  if (!apt) return missing(res);
  if (apt.userID !== req.userId)
    return res.status(403).json({ message: "Only the patient may reschedule" });
  if (apt.status !== "upcoming" || s.expired(apt))
    return res
      .status(409)
      .json({ message: "Only upcoming appointments may be rescheduled" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "SELECT ID FROM users WHERE ID IN (?, ?) ORDER BY ID FOR UPDATE",
      [apt.userID, apt.therapistID],
    );
    const [current] = await conn.query(
      "SELECT status,date,time FROM appointments WHERE ID=? FOR UPDATE",
      [apt.ID],
    );
    if (
      !current.length ||
      current[0].status !== "upcoming" ||
      s.expired(current[0])
    ) {
      await conn.rollback();
      return res
        .status(409)
        .json({ message: "Only upcoming appointments may be rescheduled" });
    }
    const [profiles] = await conn.query(
      "SELECT * FROM therapists WHERE userID=?",
      [apt.therapistID],
    );
    const normalized = v.normalizeTime(time);
    if (
      !profiles.length ||
      !s.available(profiles[0], date) ||
      !s.slots(profiles[0].startTime, profiles[0].endTime).includes(normalized)
    ) {
      await conn.rollback();
      return v.fail(res, "Time outside therapist availability");
    }
    const [conflicts] = await conn.query(
      "SELECT ID FROM appointments WHERE ID<>? AND date=? AND ABS(TIME_TO_SEC(time)-TIME_TO_SEC(?))<3600 AND status<>'cancelled' AND (userID IN (?,?) OR therapistID IN (?,?))",
      [
        apt.ID,
        date,
        normalized,
        apt.userID,
        apt.therapistID,
        apt.userID,
        apt.therapistID,
      ],
    );
    if (conflicts.length) {
      await conn.rollback();
      return res.status(409).json({ message: "Time slot already booked" });
    }
    await conn.query("UPDATE appointments SET date=?,time=? WHERE ID=?", [
      date,
      normalized,
      apt.ID,
    ]);
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

module.exports = router;

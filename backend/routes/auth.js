const router = require("express").Router(),
  db = require("../config/dbConfig"),
  bcrypt = require("bcryptjs"),
  jwt = require("jsonwebtoken"),
  v = require("../lib/validation"),
  auth = require("../middleware/authenticateToken");
require("dotenv").config();
const sign = (id, email, role) =>
  jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
function credentials(body, signup = false) {
  return (
    v.email(body.email) &&
    v.password(body.password) &&
    (!signup || (body.password.length >= 8 && v.text(body.name, 255)))
  );
}
async function signup(req, res, therapist = false) {
  const b = req.body;
  if (!credentials(b, true))
    return v.fail(
      res,
      "Valid name, email and password (8-72 characters) required",
    );
  if (
    therapist &&
    (!v.text(b.phone, 20) ||
      !v.text(b.specialization, 255) ||
      !v.text(b.bio) ||
      !v.text(b.city, 100) ||
      [b.address, b.degree, b.certifications].some(
        (value) =>
          value != null && (typeof value !== "string" || value.length > 255),
      ) ||
      !v.nonnegative(b.yearsOfExperience) ||
      !Number.isInteger(Number(b.yearsOfExperience)) ||
      Number(b.yearsOfExperience) < 0 ||
      !v.nonnegative(b.consultationFee) ||
      Number(b.consultationFee) < 0 ||
      !["online", "in-person", "both"].includes(b.mode) ||
      !Array.isArray(b.availableDays) ||
      !b.availableDays.length ||
      b.availableDays.some(
        (d) =>
          ![
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].includes(d),
      ) ||
      !v.time(b.startTime) ||
      !v.time(b.endTime) ||
      b.startTime >= b.endTime)
  )
    return v.fail(res, "Invalid therapist profile or availability");
  const email = b.email.trim().toLowerCase(),
    name = b.name.trim();
  const [existing] = await db.query("SELECT ID FROM users WHERE Email = ?", [
    email,
  ]);
  if (existing.length)
    return res.status(400).json({ message: "User already exists" });
  const hash = await bcrypt.hash(b.password, 10),
    conn = await db.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO users (Name, Email, Password) VALUES (?, ?, ?)",
      [name, email, hash],
    );
    id = r.insertId;
    if (therapist)
      await conn.query(
        "INSERT INTO therapists (userID, phone, specialization, yearsOfExperience, bio, city, address, consultationFee, mode, availableDays, startTime, endTime, degree, certifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          b.phone,
          b.specialization,
          b.yearsOfExperience,
          b.bio,
          b.city,
          b.address || null,
          b.consultationFee,
          b.mode,
          b.availableDays.join(" "),
          v.normalizeTime(b.startTime),
          v.normalizeTime(b.endTime),
          b.degree || null,
          b.certifications || null,
        ],
      );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "User already exists" });
    throw e;
  } finally {
    conn.release();
  }
  const role = therapist ? "therapist" : "user";
  res.status(201).json({
    success: true,
    message: "User created successfully",
    token: sign(id, email, role),
    user: { id, name, email, role },
  });
}
router.post("/signup", (req, res) => signup(req, res));
router.post("/therapist-signup", (req, res) => signup(req, res, true));
router.post("/login", async (req, res) => {
  if (!credentials(req.body))
    return v.fail(res, "Valid email and password required");
  const [users] = await db.query(
    "SELECT ID, Name, Email, Password FROM users WHERE Email = ?",
    [req.body.email.trim().toLowerCase()],
  );
  if (!users.length)
    return res.json({
      success: false,
      type: "email",
      message: "Invalid email or password",
    });
  const u = users[0];
  if (!(await bcrypt.compare(req.body.password, u.Password)))
    return res.json({
      success: false,
      type: "password",
      message: "Invalid email or password",
    });
  const [rows] = await db.query(
    "SELECT 1 FROM therapists WHERE userID = ? LIMIT 1",
    [u.ID],
  );
  const role = rows.length ? "therapist" : "user";
  res.json({
    success: true,
    message: "Login successful",
    token: sign(u.ID, u.Email, role),
    user: { id: u.ID, name: u.Name, email: u.Email, role },
  });
});
router.get("/me", auth, async (req, res) => {
  const [users] = await db.query(
    "SELECT ID AS id, Name AS name, Email AS email FROM users WHERE ID = ?",
    [req.userId],
  );
  if (!users.length) return res.status(404).json({ message: "User not found" });
  const [rows] = await db.query(
    "SELECT 1 FROM therapists WHERE userID = ? LIMIT 1",
    [req.userId],
  );
  res.json({ ...users[0], role: rows.length ? "therapist" : "user" });
});
router.post("/logout", auth, (req, res) => res.json({ success: true }));
module.exports = router;

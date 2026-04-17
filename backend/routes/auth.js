const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/dbConfig");
const dotenv = require("dotenv");
dotenv.config();
const {JWT_SECRET} = process.env;
const router = express.Router();


router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;

  try {
  // check if user exists
    const [existingUser] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
    );


    if (existingUser.length > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    const token = jwt.sign(
      { id: result.insertId, email, role:"user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role:"user"
      },
    });


  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({
    message: "Server error during signup",
  });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
    );


    if (users.length === 0) {
      return res.status(200).json({
        success:false,
        type:"email",
        message: "User not found",
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(200).json({
        success:false,
        type:"password",
        message: "Invalid password",
      });
    }

    const [isTherapistRows] = await db.query("SELECT 1 FROM therapists WHERE userID = ? LIMIT 1;", [user.ID])
    const isTherapist = isTherapistRows.length > 0;
  
    const token = jwt.sign(
      { id: user.ID, email: user.Email, role: isTherapist ? "therapist" : "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      success:true,
      message: "Login successful",
      token,
      user: {
        id: user.ID,
        name: user.Name,
        email: user.Email,
        role: isTherapist ? "therapist" : "user"
      },
    });


  } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({
      message: "Server error during login",
      });
    }
});

router.post("/therapist-signup", async (req, res) => {
  const { email, password, name, phone, specialization, yearsOfExperience, bio, city, address, consultationFee, mode,  availableDays, startTime, endTime, degree, certifications } = req.body;

  try {

    const [existingUser] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
    );


    if (existingUser.length > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );
    const days = availableDays.join(" ");
    const [result2] = await db.query(
      "INSERT INTO therapists (userID, phone, specialization, yearsOfExperience, bio, city, address, consultationFee, mode,  availableDays, startTime, endTime, degree, certifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [result.insertId, phone, specialization, yearsOfExperience, bio, city, address, consultationFee, mode, days , startTime, endTime, degree, certifications]
    )

    const token = jwt.sign(
      { id: result.insertId, email, role: "therapist" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role:"therapist"
      },
    });


  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({
    message: "Server error during signup",
  });
  }
});


router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const [users] = await db.query(
      "SELECT id, name, email FROM users WHERE id = ?",
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({...users[0], role: decoded.role});

  } catch (err) {
    console.error("Auth Me Error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});


module.exports = router;

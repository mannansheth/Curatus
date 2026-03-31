const express = require("express");

const jwt = require("jsonwebtoken");
const db = require("../config/dbConfig");
const dotenv = require("dotenv");
dotenv.config();
const {JWT_SECRET} = process.env;
const router = express.Router();




router.get("/stats", async (req, res) => {
  const userID = req.userId;
  const [entries] = await db.query("SELECT * FROM journal_entries WHERE userID = ?", [userID]);
  return res.json({entries});

})

module.exports = router;

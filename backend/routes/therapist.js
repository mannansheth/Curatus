const express = require("express");

const db = require("../config/dbConfig");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const {JWT_SECRET} = process.env;
const router = express.Router();



router.get("/all", async (req, res) => {
  
  //let sql = '';
  const {searchTerm, specialization, mode, maxFee} = req.query;
  let userID = null;
  
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userID = decoded.id;
      } catch (err) {
        console.log("error")
      }
    }

  var sql = userID === null ?
  `SELECT * FROM therapists th 
  JOIN users u ON u.ID = th.userID
  WHERE 
    (
      :st = "" 
    OR 
    (
      u.Name LIKE CONCAT('%', :st, '%')
      OR th.city LIKE CONCAT('%', :st, '%')
    )
    )
    AND (
      :spec = "All" 
      OR 
      th.specialization = :spec
    )
    AND (
      :mode = "All" OR :mode = ""
      OR 
      th.mode = :mode
    )
    AND ( 
      :fee = ""
      OR 
      th.consultationFee <= CAST(:fee AS UNSIGNED)
    )
  ` 
  :
    `
  SELECT th.*, u.ID, u.Name, u.Email, count FROM therapists th 
  JOIN users u ON u.ID = th.userID
  LEFT JOIN (SELECT a.therapistID, COUNT(*) AS count FROM appointments a WHERE a.userID = :userID GROUP BY a.therapistID) 
  apt ON apt.therapistID = u.ID
  WHERE 
    (
      :st = ""  
    OR 
    (
      u.Name LIKE CONCAT('%', :st, '%')
      OR th.city LIKE CONCAT('%', :st, '%')
    )
    )
    AND (
      :spec = "All" 
      OR 
      th.specialization = :spec
    )
    AND (
      :mode = "All" OR :mode = ""
      OR 
      th.mode = :mode
    )
    AND (
      :fee = ""
      OR 
      th.consultationFee <= CAST(:fee AS UNSIGNED)
    )
      ORDER BY apt.count DESC;
    `

  const [therapists] = await db.query(sql, {
    st: searchTerm,
    spec:specialization,
    mode:mode,
    fee: maxFee,
    userID: userID
  });

  return res.json({therapists});
})

module.exports = router;

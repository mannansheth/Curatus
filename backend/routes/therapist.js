const express = require("express");

const db = require("../config/dbConfig");

const router = express.Router();



router.get("/all", async (req, res) => {
  
  //let sql = '';
  const {searchTerm, specialization, mode, maxFee} = req.query;

  const sql = 
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
    );
  `
  const [therapists] = await db.query(sql, {
    st: searchTerm,
    spec:specialization,
    mode:mode,
    fee: maxFee
  });
  return res.json({therapists});
})

module.exports = router;

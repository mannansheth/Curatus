const router = require("express").Router(),
  db = require("../config/dbConfig"),
  v = require("../lib/validation");
const optionalUser = (req) => {
  try {
    return (
      require("../middleware/authenticateToken").decodeToken(
        req.headers.authorization,
      )?.id || null
    );
  } catch {
    return null;
  }
};
const columns = "th.*, u.ID, u.Name, u.Email";
router.get("/all", async (req, res) => {
  const {
    searchTerm = "",
    specialization = "All",
    mode = "All",
    maxFee = "",
  } = req.query;
  if (
    [searchTerm, specialization, mode, maxFee].some(
      (x) => typeof x !== "string",
    ) ||
    !["All", "", "online", "in-person", "both"].includes(mode) ||
    (maxFee !== "" && (!Number.isFinite(Number(maxFee)) || Number(maxFee) < 0))
  )
    return v.fail(res);
  const userID = optionalUser(req);
  const [therapists] = await db.query(
    `SELECT ${columns}, COALESCE(apt.count,0) AS count FROM therapists th JOIN users u ON u.ID=th.userID LEFT JOIN (SELECT therapistID, COUNT(*) AS count FROM appointments WHERE userID = :userID GROUP BY therapistID) apt ON apt.therapistID=u.ID WHERE (:st='' OR u.Name LIKE CONCAT('%',:st,'%') OR th.city LIKE CONCAT('%',:st,'%')) AND (:spec='All' OR :spec='' OR th.specialization=:spec) AND (:mode='All' OR :mode='' OR th.mode=:mode OR th.mode='both') AND (:fee='' OR th.consultationFee <= :fee) ORDER BY count DESC, u.Name`,
    { userID, st: searchTerm, spec: specialization, mode, fee: maxFee },
  );
  res.json({ therapists });
});
router.get("/:id", async (req, res) => {
  if (!v.id(req.params.id)) return v.fail(res);
  const [rows] = await db.query(
    `SELECT ${columns} FROM therapists th JOIN users u ON u.ID=th.userID WHERE th.userID = ?`,
    [req.params.id],
  );
  if (!rows.length)
    return res.status(404).json({ message: "Therapist not found" });
  res.json({ therapist: rows[0] });
});
module.exports = router;

const db = require("../config/dbConfig"),
  v = require("../lib/validation");
module.exports = async (aptId, userId) => {
  if (!v.id(aptId)) return null;
  const [rows] = await db.query(
    "SELECT a.*, p.Name AS patientName, t.Name AS therapistName FROM appointments a JOIN users p ON p.ID=a.userID JOIN users t ON t.ID=a.therapistID WHERE a.ID=? AND (a.userID=? OR a.therapistID=?)",
    [aptId, userId, userId],
  );
  return rows[0] || null;
};

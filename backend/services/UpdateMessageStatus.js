const db = require("../config/dbConfig");
module.exports = async (aptId, userId) => {
  await db.query(
    "UPDATE personalchats SET status = 'read' WHERE aptID = ? AND sentBy != ? AND status = 'delivered'",
    [aptId, userId],
  );
};

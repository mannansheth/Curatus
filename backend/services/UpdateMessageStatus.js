const db = require("../config/dbConfig")

const updateMessageStatus = async (aptId, userId) => {
  await db.query(`
    UPDATE personalchats SET status = 'read' WHERE aptID = ? AND sentBy = ?
    `, [aptId, userId]);
}
module.exports = updateMessageStatus
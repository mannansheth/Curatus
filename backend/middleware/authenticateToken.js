require("dotenv").config();
const jwt = require("jsonwebtoken");
function decodeToken(header) {
  if (typeof header !== "string" || !/^Bearer \S+$/i.test(header)) return null;
  const d = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  if (!Number.isSafeInteger(d.id) || d.id <= 0)
    throw new Error("Invalid identity");
  return d;
}
function authenticateToken(req, res, next) {
  if (!req.headers.authorization)
    return res.status(401).json({ message: "Authentication required" });
  try {
    const d = decodeToken(req.headers.authorization);
    if (!d) return res.status(401).json({ message: "Bearer token required" });
    req.userId = d.id;
    req.userRole = d.role;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
authenticateToken.decodeToken = decodeToken;
module.exports = authenticateToken;


const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const {JWT_SECRET} = process.env;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);

    req.userId = decoded.id; 
    next();
  });
};
module.exports = authenticateToken;
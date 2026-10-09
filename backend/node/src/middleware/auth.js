const jwt = require("jsonwebtoken");
const config = require("../config");

function attachUserIfPresent(req, res, next) {
  const token = req.cookies?.token;

  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      req.user = null;
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Login required" });
  }

  next();
}

module.exports = { attachUserIfPresent, requireAuth };

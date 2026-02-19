const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "nihonnuta_dev_jwt_secret_2026";

// 必须登录，未登录返回 401
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.fail(401, "未登录或token已过期");
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (error) {
    return res.fail(401, "token无效或已过期");
  }
}

// 可选登录，有 token 就解析，没有也放行
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      req.user = { userId: decoded.userId, username: decoded.username };
    } catch {}
  }
  next();
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;

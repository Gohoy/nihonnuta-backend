const authService = require('../services/auth.service');

/**
 * JWT 验证中间件
 * 从 Authorization: Bearer <token> 提取 token，验证后将 userId 挂到 req.userId
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = authService.verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: 'token已过期' });
  }
}

module.exports = authMiddleware;

function adminMiddleware(req, res, next) {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!req.user || !adminIds.includes(req.user.userId)) {
    return res.fail(403, "无权限");
  }
  next();
}

module.exports = adminMiddleware;

const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET || "nihonnuta_dev_jwt_secret_2026";

/**
 * Unified permission middleware factory.
 *
 * Usage:
 *   guard()                        // login required
 *   guard({ optional: true })      // login optional
 *   guard({ role: 'admin' })       // admin only
 *   guard({ membership: 'tts' })   // VIP feature gate
 */
function guard(opts = {}) {
  const { optional = false, role = null, membership = null } = opts;

  return async function (req, res, next) {
    // Step 1: Parse JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
        req.user = { userId: decoded.userId, username: decoded.username };
      } catch {
        if (!optional) return res.fail(401, "token无效或已过期");
      }
    }

    // Step 2: Auth required but no user
    if (!optional && !req.user) {
      return res.fail(401, "未登录或token已过期");
    }

    // No user in optional mode — skip further checks
    if (!req.user) return next();

    // Step 3: Role check (from DB)
    if (role) {
      try {
        const { rows } = await pool.query(
          "SELECT role FROM users WHERE user_id = $1 AND is_deleted = FALSE",
          [req.user.userId]
        );
        const userRole = rows[0]?.role || "user";
        req.user.role = userRole;

        if (role === "admin" && userRole !== "admin") {
          return res.fail(403, "无权限");
        }
      } catch (err) {
        console.error("Guard role check error:", err);
        return res.fail(500, "权限检查失败");
      }
    }

    // Step 4: Membership check
    if (membership) {
      try {
        const { rows } = await pool.query(
          "SELECT membership_type, membership_expire_time FROM users WHERE user_id = $1",
          [req.user.userId]
        );
        if (!rows[0]) return res.fail(401, "用户不存在");

        const { membership_type, membership_expire_time } = rows[0];
        const isActive =
          membership_type === "premium" &&
          membership_expire_time &&
          new Date(membership_expire_time) > new Date();

        if (!isActive) {
          return res.fail(403, "此功能需要会员");
        }
        req.membership = {
          type: membership_type,
          expireTime: membership_expire_time,
        };
      } catch (err) {
        console.error("Guard membership check error:", err);
        return res.fail(500, "会员状态检查失败");
      }
    }

    next();
  };
}

module.exports = guard;

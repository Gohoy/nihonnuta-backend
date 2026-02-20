const pool = require("../db/pool");

// 需要会员的功能配置（当前为空，不限制任何功能）
// 后续启用：在此对象中添加功能名即可
const MEMBERSHIP_REQUIRED_FEATURES = {
  // 'tts': true,
  // 'wordbook_global': true,
  // 'ai_chat': true,
};

function requireMembership(featureName) {
  return async function (req, res, next) {
    if (!MEMBERSHIP_REQUIRED_FEATURES[featureName]) {
      return next();
    }

    if (!req.user || !req.user.userId) {
      return res.fail(401, "请先登录");
    }

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
        return res.fail(403, "此功能需要会员，请先开通会员");
      }

      req.membership = {
        type: membership_type,
        expireTime: membership_expire_time,
      };
      next();
    } catch (error) {
      console.error("Membership check error:", error);
      return res.fail(500, "会员状态检查失败");
    }
  };
}

function attachMembership(req, res, next) {
  if (!req.user || !req.user.userId) return next();

  pool
    .query(
      "SELECT membership_type, membership_expire_time FROM users WHERE user_id = $1",
      [req.user.userId]
    )
    .then(({ rows }) => {
      if (rows[0]) {
        const { membership_type, membership_expire_time } = rows[0];
        const isActive =
          membership_type === "premium" &&
          membership_expire_time &&
          new Date(membership_expire_time) > new Date();
        req.membership = {
          type: isActive ? "premium" : "free",
          expireTime: membership_expire_time,
        };
      }
      next();
    })
    .catch(() => next());
}

module.exports = { requireMembership, attachMembership };
